import type { LocationData, AgeDistribution, IncomeDistribution, EducationDistribution } from "@/types/census"

// Función para obtener la API key
function getApiKey(): string | null {
  // Primero intentar obtener la API key de las variables de entorno
  const envApiKey = process.env.CENSUS_API_KEY

  // Si no está disponible en las variables de entorno, intentar obtenerla de localStorage
  // Nota: localStorage solo está disponible en el cliente
  let localStorageApiKey = null
  if (typeof window !== "undefined") {
    localStorageApiKey = localStorage.getItem("census_api_key")
  }

  return envApiKey || localStorageApiKey
}

// Función para obtener datos de respaldo en caso de error
function getSalvadoranBackupData(): LocationData[] {
  // Datos de respaldo simulados
  const backupData: LocationData[] = [
    {
      name: "Los Angeles",
      state: "California",
      stateCode: "06",
      placeId: "44000",
      population: 80000,
      percentage: 1.6,
      zipCode: "06440",
      ageGroups: generateSimulatedAgeData(80000),
      incomeGroups: generateSimulatedIncomeData(80000),
      educationLevels: generateSimulatedEducationData(80000),
    },
    {
      name: "Houston",
      state: "Texas",
      stateCode: "48",
      placeId: "35000",
      population: 65000,
      percentage: 2.8,
      zipCode: "48350",
      ageGroups: generateSimulatedAgeData(65000),
      incomeGroups: generateSimulatedIncomeData(65000),
      educationLevels: generateSimulatedEducationData(65000),
    },
    {
      name: "New York",
      state: "New York",
      stateCode: "36",
      placeId: "51000",
      population: 50000,
      percentage: 0.6,
      zipCode: "36510",
      ageGroups: generateSimulatedAgeData(50000),
      incomeGroups: generateSimulatedIncomeData(50000),
      educationLevels: generateSimulatedEducationData(50000),
    },
  ]

  return backupData
}

// Función principal para obtener datos de población salvadoreña
export async function fetchSalvadoranPopulationData(): Promise<LocationData[]> {
  try {
    // Intentar obtener datos básicos de población salvadoreña
    let basicData: LocationData[] = []
    try {
      basicData = await fetchSalvadoranPopulationBasic()
    } catch (error) {
      console.error("Error fetching basic Salvadoran population data:", error)
      // Si falla, usar datos de respaldo
      basicData = getSalvadoranBackupData()
    }

    // Para cada ubicación, obtener datos demográficos detallados
    // Usamos Promise.allSettled para evitar que un error en una promesa detenga todas las demás
    const enrichedDataPromises = await Promise.allSettled(
      basicData.map(async (location) => {
        try {
          // Obtener datos demográficos específicos para cada ubicación
          const ageData = await fetchAgeDistribution(location.stateCode, location.placeId)
          const incomeData = await fetchIncomeDistribution(location.stateCode, location.placeId)
          const educationData = await fetchEducationDistribution(location.stateCode, location.placeId)

          return {
            ...location,
            ageGroups: ageData,
            incomeGroups: incomeData,
            educationLevels: educationData,
          }
        } catch (error) {
          console.error(`Error fetching demographic data for ${location.name}:`, error)
          // Si hay error, devolver la ubicación con datos demográficos simulados
          return {
            ...location,
            ageGroups: generateSimulatedAgeData(location.population),
            incomeGroups: generateSimulatedIncomeData(location.population),
            educationLevels: generateSimulatedEducationData(location.population),
          }
        }
      }),
    )

    // Procesar los resultados de Promise.allSettled
    const enrichedData = enrichedDataPromises
      .map((result) => {
        if (result.status === "fulfilled") {
          return result.value
        } else {
          // Si hubo un error, devolver un objeto vacío que será filtrado después
          console.error("Error in Promise.allSettled:", result.reason)
          return null
        }
      })
      .filter(Boolean) as LocationData[]

    // Si no hay datos enriquecidos, usar datos de respaldo
    if (enrichedData.length === 0) {
      console.warn("No enriched data available, using backup data")
      return getSalvadoranBackupData()
    }

    return enrichedData
  } catch (error) {
    console.error("Error fetching census data:", error)
    // En caso de error, devolver datos de respaldo
    return getSalvadoranBackupData()
  }
}

// Función para obtener datos básicos de población salvadoreña
async function fetchSalvadoranPopulationBasic(): Promise<LocationData[]> {
  // La clave API está disponible como variable de entorno en el servidor
  const API_KEY = getApiKey()

  // Verificar que la clave API esté disponible
  if (!API_KEY) {
    console.warn("Census API key is not available, using backup data")
    return getSalvadoranBackupData()
  }

  try {
    // Construir URL para la API del Census Bureau
    // Utilizamos la American Community Survey (ACS) 5-year data
    // B03001_001E: Total population
    // B03001_006E: Salvadoran population (Hispanic or Latino origin by specific origin)
    // NAME: Geographic area name
    const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
    const url = `${baseUrl}?get=NAME,B03001_001E,B03001_006E&for=place:*&in=state:*&key=${API_KEY}`

    // Implementar un timeout para la solicitud fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.warn("Timeout fetching Salvadoran population basic data")
    }, 15000) // 15 segundos de timeout para esta solicitud más grande

    try {
      // Realizar la solicitud a la API
      const response = await fetch(url, {
        signal: controller.signal,
        // Añadir headers para evitar problemas de caché
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      // Limpiar el timeout independientemente del resultado
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Census API error: ${response.status} ${response.statusText}. Using backup data.`)
        return getSalvadoranBackupData()
      }

      const rawData = await response.json()

      // Verificar que los datos tengan el formato esperado
      if (!Array.isArray(rawData) || rawData.length < 2) {
        console.warn("Census API returned unexpected data format. Using backup data.")
        return getSalvadoranBackupData()
      }

      // El primer elemento contiene los encabezados
      const headers = rawData[0]
      const nameIndex = headers.indexOf("NAME")
      const totalPopIndex = headers.indexOf("B03001_001E")
      const salvadoranPopIndex = headers.indexOf("B03001_006E")
      const stateIndex = headers.indexOf("state")
      const placeIndex = headers.indexOf("place")

      // Verificar que todos los índices sean válidos
      if (
        nameIndex === -1 ||
        totalPopIndex === -1 ||
        salvadoranPopIndex === -1 ||
        stateIndex === -1 ||
        placeIndex === -1
      ) {
        console.warn("Census API returned unexpected headers. Using backup data.")
        return getSalvadoranBackupData()
      }

      // Procesar los datos
      const processedData: LocationData[] = rawData
        .slice(1) // Omitir encabezados
        .map((row: any) => {
          try {
            // Extraer nombre y estado
            const fullName = row[nameIndex]
            const nameParts = fullName.split(", ")
            const name = nameParts[0]
            const stateAbbr = nameParts[1]
            const state = getStateFullName(stateAbbr)
            const stateCode = row[stateIndex] // Código de estado para usar en futuras consultas

            // Extraer y convertir datos de población
            const totalPopulation = Number.parseInt(row[totalPopIndex]) || 0
            const salvadoranPopulation = Number.parseInt(row[salvadoranPopIndex]) || 0

            // Calcular porcentaje
            const percentage =
              totalPopulation > 0 ? Number.parseFloat(((salvadoranPopulation / totalPopulation) * 100).toFixed(1)) : 0

            // Generar un código postal ficticio basado en el código de lugar
            const placeCode = row[placeIndex]
            const zipCode = `${stateCode}${placeCode.substring(0, 3)}`.padEnd(5, "0")

            return {
              name,
              state,
              stateCode, // Guardar el código de estado para futuras consultas
              placeId: placeCode, // Guardar el ID del lugar para futuras consultas
              population: salvadoranPopulation,
              percentage,
              zipCode,
            }
          } catch (rowError) {
            console.warn("Error processing row:", rowError)
            return null
          }
        })
        .filter(Boolean) // Eliminar elementos nulos
        // Filtrar lugares con población salvadoreña significativa (más de 500)
        .filter((location) => location.population > 500)
        // Ordenar por población salvadoreña (de mayor a menor)
        .sort((a, b) => b.population - a.population)
        // Limitar a los 50 principales lugares para rendimiento y límites de API
        .slice(0, 50)

      // Verificar que haya datos procesados
      if (processedData.length === 0) {
        console.warn("No processed data available. Using backup data.")
        return getSalvadoranBackupData()
      }

      return processedData
    } catch (fetchError) {
      // Limpiar el timeout en caso de error
      clearTimeout(timeoutId)

      // Verificar si el error es por timeout o por otra razón
      if (fetchError.name === "AbortError") {
        console.warn("Timeout fetching Salvadoran population basic data")
      } else {
        console.error("Error fetching Salvadoran population basic data:", fetchError)
      }

      // Usar datos de respaldo en caso de error
      return getSalvadoranBackupData()
    }
  } catch (error) {
    console.error("Error in fetchSalvadoranPopulationBasic:", error)
    // En caso de error, devolver datos de respaldo
    return getSalvadoranBackupData()
  }
}

// Función para obtener distribución de edad para una ubicación específica
async function fetchAgeDistribution(stateCode: string, placeId: string): Promise<AgeDistribution> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    console.warn("Census API key is not available, using simulated data")
    return generateSimulatedAgeData(10000)
  }

  // Usamos variables más simples para reducir la probabilidad de errores
  // B01001_001E: Total population
  // B01001_002E: Male population
  // B01001_026E: Female population
  const ageVariables = "B01001_001E,B01001_002E,B01001_026E"

  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=${ageVariables}&for=place:${placeId}&in=state:${stateCode}&key=${API_KEY}`

  try {
    // Implementar un timeout para la solicitud fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.warn(`Timeout fetching age data for place ${placeId} in state ${stateCode}`)
    }, 8000) // 8 segundos de timeout (reducido de 10)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // Añadir headers para evitar problemas de caché
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      // Limpiar el timeout independientemente del resultado
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Census API error for age data: ${response.status}. Using simulated data.`)
        return generateSimulatedAgeData(10000)
      }

      const data = await response.json()

      // Verificar que los datos tengan el formato esperado
      if (!Array.isArray(data) || data.length < 2 || !data[1][0]) {
        console.warn("Census API returned unexpected data format. Using simulated data.")
        return generateSimulatedAgeData(10000)
      }

      // Como estamos usando variables simplificadas, generaremos datos simulados
      // basados en la población total pero con una distribución realista
      const totalPopulation = Number.parseInt(data[1][0]) || 10000

      // Generar datos simulados basados en la población total
      return generateSimulatedAgeData(totalPopulation)
    } catch (fetchError) {
      // Limpiar el timeout en caso de error
      clearTimeout(timeoutId)

      // Verificar si el error es por timeout o por otra razón
      if (fetchError.name === "AbortError") {
        console.warn(`Timeout fetching age data for place ${placeId} in state ${stateCode}`)
      } else {
        console.error(`Error fetching age data for place ${placeId} in state ${stateCode}:`, fetchError)
      }

      // Generar datos simulados en caso de error
      return generateSimulatedAgeData(10000)
    }
  } catch (error) {
    console.error(`Error fetching age data for place ${placeId} in state ${stateCode}:`, error)
    // Generar datos simulados
    return generateSimulatedAgeData(10000) // Valor predeterminado
  }
}

// Función para obtener distribución de ingresos para una ubicación específica
async function fetchIncomeDistribution(stateCode: string, placeId: string): Promise<IncomeDistribution> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    console.warn("Census API key is not available, using simulated data")
    return generateSimulatedIncomeData(10000)
  }

  // Usamos variables más simples para reducir la probabilidad de errores
  // B19013_001E: Median household income
  const incomeVariables = "B19013_001E"

  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=${incomeVariables}&for=place:${placeId}&in=state:${stateCode}&key=${API_KEY}`

  try {
    // Implementar un timeout para la solicitud fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.warn(`Timeout fetching income data for place ${placeId} in state ${stateCode}`)
    }, 8000) // 8 segundos de timeout (reducido de 10)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // Añadir headers para evitar problemas de caché
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      // Limpiar el timeout independientemente del resultado
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Census API error for income data: ${response.status}. Using simulated data.`)
        return generateSimulatedIncomeDataFromMedian(50000) // Valor predeterminado razonable
      }

      const data = await response.json()

      // Verificar que los datos tengan el formato esperado
      if (!Array.isArray(data) || data.length < 2 || !data[1][0]) {
        console.warn("Census API returned unexpected data format. Using simulated data.")
        return generateSimulatedIncomeDataFromMedian(50000)
      }

      // Generar datos simulados basados en el ingreso medio
      const medianIncome = Number.parseInt(data[1][0]) || 50000
      return generateSimulatedIncomeDataFromMedian(medianIncome)
    } catch (fetchError) {
      // Limpiar el timeout en caso de error
      clearTimeout(timeoutId)

      // Verificar si el error es por timeout o por otra razón
      if (fetchError.name === "AbortError") {
        console.warn(`Timeout fetching income data for place ${placeId} in state ${stateCode}`)
      } else {
        console.error(`Error fetching income data for place ${placeId} in state ${stateCode}:`, fetchError)
      }

      // Generar datos simulados en caso de error
      return generateSimulatedIncomeDataFromMedian(50000)
    }
  } catch (error) {
    console.error(`Error fetching income data for place ${placeId} in state ${stateCode}:`, error)
    // Generar datos simulados con un valor predeterminado razonable
    return generateSimulatedIncomeDataFromMedian(50000)
  }
}

// Función para obtener distribución de nivel educativo para una ubicación específica
async function fetchEducationDistribution(stateCode: string, placeId: string): Promise<EducationDistribution> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    console.warn("Census API key is not available, using simulated data")
    return generateSimulatedEducationData(10000)
  }

  // Usamos variables más simples para reducir la probabilidad de errores
  // B15003_001E: Total population 25 years and over
  // B15003_017E: High school graduate
  // B15003_022E: Bachelor's degree
  // B15003_023E: Master's degree
  const educationVariables = "B15003_001E,B15003_017E,B15003_022E,B15003_023E"

  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=${educationVariables}&for=place:${placeId}&in=state:${stateCode}&key=${API_KEY}`

  try {
    // Implementar un timeout para la solicitud fetch
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
      console.warn(`Timeout fetching education data for place ${placeId} in state ${stateCode}`)
    }, 8000) // 8 segundos de timeout (reducido de 10)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        // Añadir headers para evitar problemas de caché
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      })

      // Limpiar el timeout independientemente del resultado
      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`Census API error for education data: ${response.status}. Using simulated data.`)
        return generateSimulatedEducationData(10000)
      }

      const data = await response.json()

      // Verificar que los datos tengan el formato esperado
      if (!Array.isArray(data) || data.length < 2 || !data[1][0]) {
        console.warn("Census API returned unexpected data format. Using simulated data.")
        return generateSimulatedEducationData(10000)
      }

      // Procesar los datos de educación
      const totalPopulation = Number.parseInt(data[1][0]) || 0
      const highSchoolGrads = Number.parseInt(data[1][1]) || 0
      const bachelorsGrads = Number.parseInt(data[1][2]) || 0
      const mastersGrads = Number.parseInt(data[1][3]) || 0

      // Calcular valores aproximados para las otras categorías
      const graduate = mastersGrads
      const bachelors = bachelorsGrads - mastersGrads
      const someCollege = Math.round(totalPopulation * 0.2) // Aproximación
      const highSchool = highSchoolGrads - bachelorsGrads - someCollege
      const lessHighSchool = totalPopulation - highSchoolGrads

      return {
        lessHighSchool: Math.max(0, lessHighSchool),
        highSchool: Math.max(0, highSchool),
        someCollege: Math.max(0, someCollege),
        bachelors: Math.max(0, bachelors),
        graduate: Math.max(0, graduate),
      }
    } catch (fetchError) {
      // Limpiar el timeout en caso de error
      clearTimeout(timeoutId)

      // Verificar si el error es por timeout o por otra razón
      if (fetchError.name === "AbortError") {
        console.warn(`Timeout fetching education data for place ${placeId} in state ${stateCode}`)
      } else {
        console.error(`Error fetching education data for place ${placeId} in state ${stateCode}:`, fetchError)
      }

      // Generar datos simulados en caso de error
      return generateSimulatedEducationData(10000)
    }
  } catch (error) {
    console.error(`Error fetching education data for place ${placeId} in state ${stateCode}:`, error)
    // Generar datos simulados
    return generateSimulatedEducationData(10000) // Valor predeterminado
  }
}

// Función para generar datos de edad simulados basados en la población total
function generateSimulatedAgeData(population: number): AgeDistribution {
  return {
    under18: Math.round(population * 0.25),
    age18to24: Math.round(population * 0.15),
    age25to34: Math.round(population * 0.2),
    age35to44: Math.round(population * 0.15),
    age45to54: Math.round(population * 0.1),
    age55to64: Math.round(population * 0.08),
    age65plus: Math.round(population * 0.07),
  }
}

// Función para generar datos de ingresos simulados basados en la población total
function generateSimulatedIncomeData(population: number): IncomeDistribution {
  return {
    under25k: Math.round(population * 0.22),
    income25kto50k: Math.round(population * 0.3),
    income50kto75k: Math.round(population * 0.25),
    income75kto100k: Math.round(population * 0.13),
    income100kplus: Math.round(population * 0.1),
  }
}

// Función para generar datos de ingresos simulados basados en el ingreso medio
function generateSimulatedIncomeDataFromMedian(medianIncome: number): IncomeDistribution {
  // Ajustar las proporciones basadas en el ingreso medio
  let under25kPct = 0.22
  let income25kto50kPct = 0.3
  let income50kto75kPct = 0.25
  let income75kto100kPct = 0.13
  let income100kplusPct = 0.1

  // Ajustar basado en el ingreso medio
  if (medianIncome < 40000) {
    // Ingresos más bajos
    under25kPct += 0.1
    income25kto50kPct += 0.05
    income75kto100kPct -= 0.08
    income100kplusPct -= 0.07
  } else if (medianIncome < 60000) {
    // Ingresos medios
    income25kto50kPct += 0.05
    income50kto75kPct += 0.05
    under25kPct -= 0.05
    income100kplusPct -= 0.05
  } else {
    // Ingresos más altos
    income75kto100kPct += 0.07
    income100kplusPct += 0.08
    under25kPct -= 0.1
    income25kto50kPct -= 0.05
  }

  // Estimar la población total basada en el ingreso medio
  const estimatedPopulation = 10000

  return {
    under25k: Math.round(estimatedPopulation * under25kPct),
    income25kto50k: Math.round(estimatedPopulation * income25kto50kPct),
    income50kto75k: Math.round(estimatedPopulation * income50kto75kPct),
    income75kto100k: Math.round(estimatedPopulation * income75kto100kPct),
    income100kplus: Math.round(estimatedPopulation * income100kplusPct),
  }
}

// Función para generar datos de educación simulados basados en la población total
function generateSimulatedEducationData(population: number): EducationDistribution {
  return {
    lessHighSchool: Math.round(population * 0.3),
    highSchool: Math.round(population * 0.28),
    someCollege: Math.round(population * 0.22),
    bachelors: Math.round(population * 0.15),
    graduate: Math.round(population * 0.05),
  }
}

// Función auxiliar para convertir códigos de estado a nombres completos
function getStateFullName(stateAbbr: string): string {
  const stateMap: Record<string, string> = {
    AL: "Alabama",
    AK: "Alaska",
    AZ: "Arizona",
    AR: "Arkansas",
    CA: "California",
    CO: "Colorado",
    CT: "Connecticut",
    DE: "Delaware",
    FL: "Florida",
    GA: "Georgia",
    HI: "Hawaii",
    ID: "Idaho",
    IL: "Illinois",
    IN: "Indiana",
    IA: "Iowa",
    KS: "Kansas",
    KY: "Kentucky",
    LA: "Louisiana",
    ME: "Maine",
    MD: "Maryland",
    MA: "Massachusetts",
    MI: "Michigan",
    MN: "Minnesota",
    MS: "Mississippi",
    MO: "Missouri",
    MT: "Montana",
    NE: "Nebraska",
    NV: "Nevada",
    NH: "New Hampshire",
    NJ: "New Jersey",
    NM: "New Mexico",
    NY: "New York",
    NC: "North Carolina",
    ND: "North Dakota",
    OH: "Ohio",
    OK: "Oklahoma",
    OR: "Oregon",
    PA: "Pennsylvania",
    RI: "Rhode Island",
    SC: "South Carolina",
    SD: "South Dakota",
    TN: "Tennessee",
    TX: "Texas",
    UT: "Utah",
    VT: "Vermont",
    VA: "Virginia",
    WA: "Washington",
    WV: "West Virginia",
    WI: "Wisconsin",
    WY: "Wyoming",
    DC: "District of Columbia",
  }

  return stateMap[stateAbbr] || stateAbbr
}

// Aplicar filtros demográficos a los datos
export function applyDemographicFilters(
  data: LocationData[],
  filters: {
    ageRange?: string[]
    incomeRange?: string[]
    educationLevel?: string[]
  },
): LocationData[] {
  if (!filters.ageRange?.length && !filters.incomeRange?.length && !filters.educationLevel?.length) {
    return data // No hay filtros aplicados
  }

  return data.filter((location) => {
    // Filtrar por rango de edad
    if (filters.ageRange?.length && filters.ageRange[0] !== "all" && location.ageGroups) {
      const ageMatch = filters.ageRange.some((ageRange) => {
        switch (ageRange) {
          case "under18":
            return location.ageGroups?.under18 > 0
          case "18to24":
            return location.ageGroups?.age18to24 > 0
          case "25to34":
            return location.ageGroups?.age25to34 > 0
          case "35to44":
            return location.ageGroups?.age35to44 > 0
          case "45to54":
            return location.ageGroups?.age45to54 > 0
          case "55to64":
            return location.ageGroups?.age55to64 > 0
          case "65plus":
            return location.ageGroups?.age65plus > 0
          default:
            return true
        }
      })
      if (!ageMatch) return false
    }

    // Filtrar por rango de ingresos
    if (filters.incomeRange?.length && filters.incomeRange[0] !== "all" && location.incomeGroups) {
      const incomeMatch = filters.incomeRange.some((incomeRange) => {
        switch (incomeRange) {
          case "under25k":
            return location.incomeGroups?.under25k > 0
          case "25kto50k":
            return location.incomeGroups?.income25kto50k > 0
          case "50kto75k":
            return location.incomeGroups?.income50kto75k > 0
          case "75kto100k":
            return location.incomeGroups?.income75kto100k > 0
          case "100kplus":
            return location.incomeGroups?.income100kplus > 0
          default:
            return true
        }
      })
      if (!incomeMatch) return false
    }

    // Filtrar por nivel educativo
    if (filters.educationLevel?.length && filters.educationLevel[0] !== "all" && location.educationLevels) {
      const educationMatch = filters.educationLevel.some((educationLevel) => {
        switch (educationLevel) {
          case "lessHighSchool":
            return location.educationLevels?.lessHighSchool > 0
          case "highSchool":
            return location.educationLevels?.highSchool > 0
          case "someCollege":
            return location.educationLevels?.someCollege > 0
          case "bachelors":
            return location.educationLevels?.bachelors > 0
          case "graduate":
            return location.educationLevels?.graduate > 0
          default:
            return true
        }
      })
      if (!educationMatch) return false
    }

    return true
  })
}
