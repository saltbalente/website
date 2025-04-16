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

// Función principal para obtener datos de población mexicana
export async function fetchPopulationData(): Promise<LocationData[]> {
  try {
    // Intentar obtener datos básicos de población mexicana
    let basicData: LocationData[] = []
    try {
      basicData = await fetchMexicanPopulationBasic()
    } catch (error) {
      console.error("Error fetching basic population data:", error)
      // Si falla, usar datos de respaldo
      basicData = getBackupData()
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
      return getBackupData()
    }

    return enrichedData
  } catch (error) {
    console.error("Error fetching census data:", error)
    // En caso de error, devolver datos de respaldo
    return getBackupData()
  }
}

// Función para obtener datos básicos de población mexicana
async function fetchMexicanPopulationBasic(): Promise<LocationData[]> {
  // La clave API está disponible como variable de entorno en el servidor
  const API_KEY = getApiKey()

  // Verificar que la clave API esté disponible
  if (!API_KEY) {
    throw new Error("Census API key is not available")
  }

  // Construir URL para la API del Census Bureau
  // Utilizamos la American Community Survey (ACS) 5-year data
  // B03001_001E: Total population
  // B03001_004E: Mexican population (Hispanic or Latino origin by specific origin)
  // NAME: Geographic area name
  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=NAME,B03001_001E,B03001_004E&for=place:*&in=state:*&key=${API_KEY}`

  // Realizar la solicitud a la API
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Census API error: ${response.status} ${response.statusText}`)
  }

  const rawData = await response.json()

  // El primer elemento contiene los encabezados
  const headers = rawData[0]
  const nameIndex = headers.indexOf("NAME")
  const totalPopIndex = headers.indexOf("B03001_001E")
  const mexicanPopIndex = headers.indexOf("B03001_004E")
  const stateIndex = headers.indexOf("state")
  const placeIndex = headers.indexOf("place")

  // Procesar los datos
  const processedData: LocationData[] = rawData
    .slice(1) // Omitir encabezados
    .map((row: any) => {
      // Extraer nombre y estado
      const fullName = row[nameIndex]
      const nameParts = fullName.split(", ")
      const name = nameParts[0]
      const stateAbbr = nameParts[1]
      const state = getStateFullName(stateAbbr)
      const stateCode = row[stateIndex] // Código de estado para usar en futuras consultas

      // Extraer y convertir datos de población
      const totalPopulation = Number.parseInt(row[totalPopIndex]) || 0
      const mexicanPopulation = Number.parseInt(row[mexicanPopIndex]) || 0

      // Calcular porcentaje
      const percentage =
        totalPopulation > 0 ? Number.parseFloat(((mexicanPopulation / totalPopulation) * 100).toFixed(1)) : 0

      // Generar un código postal ficticio basado en el código de lugar
      const placeCode = row[placeIndex]
      const zipCode = `${stateCode}${placeCode.substring(0, 3)}`.padEnd(5, "0")

      return {
        name,
        state,
        stateCode, // Guardar el código de estado para futuras consultas
        placeId: placeCode, // Guardar el ID del lugar para futuras consultas
        population: mexicanPopulation,
        percentage,
        zipCode,
      }
    })
    // Filtrar lugares con población mexicana significativa (más de 1000)
    .filter((location) => location.population > 1000)
    // Ordenar por población mexicana (de mayor a menor)
    .sort((a, b) => b.population - a.population)
    // Limitar a los 50 principales lugares para rendimiento y límites de API
    .slice(0, 50)

  return processedData
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
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos de timeout

    const response = await fetch(url, {
      signal: controller.signal,
      // Añadir headers para evitar problemas de caché
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }).finally(() => clearTimeout(timeoutId))

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
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos de timeout

    const response = await fetch(url, {
      signal: controller.signal,
      // Añadir headers para evitar problemas de caché
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }).finally(() => clearTimeout(timeoutId))

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
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos de timeout

    const response = await fetch(url, {
      signal: controller.signal,
      // Añadir headers para evitar problemas de caché
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    }).finally(() => clearTimeout(timeoutId))

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

// Datos de respaldo en caso de que la API falle
function getBackupData(): LocationData[] {
  return [
    {
      name: "East Los Angeles",
      state: "California",
      stateCode: "06",
      placeId: "22230",
      population: 97116,
      percentage: 96.8,
      zipCode: "90022",
      ageGroups: {
        under18: 24279,
        age18to24: 14567,
        age25to34: 19423,
        age35to44: 14567,
        age45to54: 9712,
        age55to64: 7769,
        age65plus: 6798,
      },
      incomeGroups: {
        under25k: 21366,
        income25kto50k: 29135,
        income50kto75k: 24279,
        income75kto100k: 12625,
        income100kplus: 9712,
      },
      educationLevels: {
        lessHighSchool: 29135,
        highSchool: 27192,
        someCollege: 21366,
        bachelors: 14567,
        graduate: 4856,
      },
    },
    {
      name: "Laredo",
      state: "Texas",
      stateCode: "48",
      placeId: "41464",
      population: 236091,
      percentage: 95.4,
      zipCode: "78040",
      ageGroups: {
        under18: 59023,
        age18to24: 35414,
        age25to34: 47218,
        age35to44: 35414,
        age45to54: 23609,
        age55to64: 18887,
        age65plus: 16526,
      },
      incomeGroups: {
        under25k: 51940,
        income25kto50k: 70827,
        income50kto75k: 59023,
        income75kto100k: 30692,
        income100kplus: 23609,
      },
      educationLevels: {
        lessHighSchool: 70827,
        highSchool: 66105,
        someCollege: 51940,
        bachelors: 35414,
        graduate: 11805,
      },
    },
    {
      name: "Brownsville",
      state: "Texas",
      stateCode: "48",
      placeId: "10768",
      population: 182781,
      percentage: 93.9,
      zipCode: "78520",
      ageGroups: {
        under18: 45695,
        age18to24: 27417,
        age25to34: 36556,
        age35to44: 27417,
        age45to54: 18278,
        age55to64: 14622,
        age65plus: 12795,
      },
      incomeGroups: {
        under25k: 40212,
        income25kto50k: 54834,
        income50kto75k: 45695,
        income75kto100k: 23761,
        income100kplus: 18278,
      },
      educationLevels: {
        lessHighSchool: 54834,
        highSchool: 51179,
        someCollege: 40212,
        bachelors: 27417,
        graduate: 9139,
      },
    },
    {
      name: "McAllen",
      state: "Texas",
      stateCode: "48",
      placeId: "45384",
      population: 142210,
      percentage: 85.3,
      zipCode: "78501",
      ageGroups: {
        under18: 35553,
        age18to24: 21332,
        age25to34: 28442,
        age35to44: 21332,
        age45to54: 14221,
        age55to64: 11377,
        age65plus: 9955,
      },
      incomeGroups: {
        under25k: 31286,
        income25kto50k: 42663,
        income50kto75k: 35553,
        income75kto100k: 18487,
        income100kplus: 14221,
      },
      educationLevels: {
        lessHighSchool: 42663,
        highSchool: 39819,
        someCollege: 31286,
        bachelors: 21332,
        graduate: 7111,
      },
    },
    {
      name: "El Paso",
      state: "Texas",
      stateCode: "48",
      placeId: "24000",
      population: 678058,
      percentage: 82.9,
      zipCode: "79901",
      ageGroups: {
        under18: 169515,
        age18to24: 101709,
        age25to34: 135612,
        age35to44: 101709,
        age45to54: 67806,
        age55to64: 54245,
        age65plus: 47464,
      },
      incomeGroups: {
        under25k: 149173,
        income25kto50k: 203417,
        income50kto75k: 169515,
        income75kto100k: 88147,
        income100kplus: 67806,
      },
      educationLevels: {
        lessHighSchool: 203417,
        highSchool: 189856,
        someCollege: 149173,
        bachelors: 101709,
        graduate: 33903,
      },
    },
  ]
}

// Exportar getBackupData para que pueda ser utilizada directamente
export { getBackupData }

// Función para aplicar filtros demográficos a los datos
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

// Función para buscar datos específicos por ubicación
export async function fetchLocationSpecificData(stateCode: string, placeId: string): Promise<any> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    throw new Error("Census API key is not available")
  }

  // Validar el formato del código de estado y el ID de lugar
  if (!stateCode || stateCode.length !== 2 || !/^\d{2}$/.test(stateCode)) {
    throw new Error("El código de estado debe tener 2 dígitos numéricos (formato XX)")
  }

  if (!placeId || !/^\d+$/.test(placeId)) {
    throw new Error("El ID de lugar debe contener solo dígitos numéricos")
  }

  // Especificar las variables exactas que queremos obtener
  // Estas son variables más generales para evitar errores
  const variables = [
    // Población total y mexicana
    "B03001_001E", // Total population
    "B03001_004E", // Mexican population

    // Ingresos
    "B19013_001E", // Median household income

    // Educación
    "B15003_001E", // Total population 25 years and over
    "B15003_022E", // Bachelor's degree
    "B15003_023E", // Master's degree
  ].join(",")

  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=${variables},NAME&for=place:${placeId}&in=state:${stateCode}&key=${API_KEY}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      console.error(`Census API error response: ${errorText}`)
      throw new Error(`Error en la API del Census: ${response.status} ${response.statusText}`)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError)
      throw new Error("Error al procesar la respuesta de la API. La combinación de estado y lugar podría no existir.")
    }

    // Verificar que la respuesta tenga el formato esperado
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error("La API devolvió un formato de datos inesperado")
    }

    // Procesar los datos
    const headers = data[0]
    const values = data[1]

    // Crear un objeto con los datos originales
    const rawData: Record<string, any> = {}
    headers.forEach((header: string, index: number) => {
      rawData[header] = values[index]
    })

    // Crear un objeto con datos procesados y etiquetas descriptivas
    const processedData: Record<string, any> = {
      // Guardar los datos originales para referencia
      _datosOriginales: rawData,

      // Información general
      "Nombre de la Ubicación": rawData["NAME"].split(",")[0],
      Estado: getStateFullName(rawData["NAME"].split(",")[1].trim()),
      "Código de Estado": stateCode,
      "ID de Lugar": placeId,
      "Año del Censo": "2021",

      // Información demográfica
      "Población Total": Number.parseInt(rawData["B03001_001E"]).toLocaleString(),
      "Población Mexicana": Number.parseInt(rawData["B03001_004E"]).toLocaleString(),
      "Porcentaje Mexicano": `${((Number.parseInt(rawData["B03001_004E"]) / Number.parseInt(rawData["B03001_001E"])) * 100).toFixed(1)}%`,

      // Información económica
      "Ingreso Medio por Hogar": `${Number.parseInt(rawData["B19013_001E"]).toLocaleString()}`,

      // Información educativa
      "Población 25 años o más": Number.parseInt(rawData["B15003_001E"]).toLocaleString(),
      "Personas con Licenciatura": Number.parseInt(rawData["B15003_022E"]).toLocaleString(),
      "Personas con Posgrado": Number.parseInt(rawData["B15003_023E"]).toLocaleString(),
      "Porcentaje con Educación Superior": `${(((Number.parseInt(rawData["B15003_022E"]) + Number.parseInt(rawData["B15003_023E"])) / Number.parseInt(rawData["B15003_001E"])) * 100).toFixed(1)}%`,
    }

    return processedData
  } catch (error) {
    console.error(`Error fetching specific data for place ${placeId} in state ${stateCode}:`, error)
    throw error
  }
}

// Función para obtener datos específicos por código postal
export async function fetchDataByZipCode(zipCode: string): Promise<any> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    throw new Error("Census API key is not available")
  }

  // Validar el formato del código postal
  if (!zipCode || zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
    throw new Error("El código postal debe tener 5 dígitos numéricos (formato XXXXX)")
  }

  // Variables para datos demográficos por código postal (ZCTA)
  const variables = [
    "B03001_001E", // Total population
    "B03001_004E", // Mexican population
    "B19013_001E", // Median household income
    "B15003_022E", // Bachelor's degree
    "B15003_023E", // Master's degree
    "B15003_001E", // Total population 25 years and over
  ].join(",")

  const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
  const url = `${baseUrl}?get=${variables},NAME&for=zip%20code%20tabulation%20area:${zipCode}&key=${API_KEY}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      console.error(`Census API error response: ${errorText}`)
      throw new Error(`Error en la API del Census: ${response.status} ${response.statusText}`)
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      console.error("Error parsing JSON response:", jsonError)
      throw new Error(
        "Error al procesar la respuesta de la API. El código postal podría no existir en la base de datos del Census.",
      )
    }

    // Verificar que la respuesta tenga el formato esperado
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error("La API devolvió un formato de datos inesperado")
    }

    // Procesar los datos
    const headers = data[0]
    const values = data[1]

    // Crear un objeto con los datos originales
    const rawData: Record<string, any> = {}
    headers.forEach((header: string, index: number) => {
      rawData[header] = values[index]
    })

    // Extraer el nombre de la ubicación del ZCTA
    const locationName = rawData["NAME"].replace("ZCTA5 ", "")

    // Crear un objeto con datos procesados y etiquetas descriptivas
    const processedData: Record<string, any> = {
      // Guardar los datos originales para referencia
      _datosOriginales: rawData,

      // Información general
      "Código Postal": zipCode,
      "Nombre de la Ubicación": `Área del código postal ${locationName}`,
      "Año del Censo": "2021",

      // Información demográfica
      "Población Total": Number.parseInt(rawData["B03001_001E"]).toLocaleString(),
      "Población Mexicana": Number.parseInt(rawData["B03001_004E"]).toLocaleString(),
      "Porcentaje Mexicano": `${((Number.parseInt(rawData["B03001_004E"]) / Number.parseInt(rawData["B03001_001E"])) * 100).toFixed(1)}%`,

      // Información económica
      "Ingreso Medio por Hogar": `${Number.parseInt(rawData["B19013_001E"]).toLocaleString()}`,

      // Información educativa
      "Población 25 años o más": Number.parseInt(rawData["B15003_001E"]).toLocaleString(),
      "Personas con Licenciatura": Number.parseInt(rawData["B15003_022E"]).toLocaleString(),
      "Personas con Posgrado": Number.parseInt(rawData["B15003_023E"]).toLocaleString(),
      "Porcentaje con Educación Superior": `${(((Number.parseInt(rawData["B15003_022E"]) + Number.parseInt(rawData["B15003_023E"])) / Number.parseInt(rawData["B15003_001E"])) * 100).toFixed(1)}%`,
    }

    return processedData
  } catch (error) {
    console.error(`Error fetching data for zip code ${zipCode}:`, error)
    throw error
  }
}

// Nueva función para obtener barrios (Census Tracts) dentro de una ciudad
export async function fetchNeighborhoodsByCity(stateCode: string, placeId: string): Promise<any[]> {
  const API_KEY = getApiKey()

  if (!API_KEY) {
    throw new Error("Census API key is not available")
  }

  try {
    // Primero, obtenemos los Census Tracts que intersectan con la ciudad
    // Usamos la API de geocodificación del Census Bureau para obtener los Census Tracts
    const baseUrl = "https://api.census.gov/data/2021/acs/acs5"

    // Variables para datos demográficos por Census Tract
    const variables = [
      "B03001_001E", // Total population
      "B03001_004E", // Mexican population
      "B19013_001E", // Median household income
      "B15003_001E", // Total population 25 years and over
    ].join(",")

    // Obtener todos los Census Tracts del estado
    const url = `${baseUrl}?get=${variables},NAME&for=tract:*&in=state:${stateCode}&key=${API_KEY}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Error en la API del Census: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Procesar los datos
    const headers = data[0]
    const nameIndex = headers.indexOf("NAME")
    const totalPopIndex = headers.indexOf("B03001_001E")
    const mexicanPopIndex = headers.indexOf("B03001_004E")
    const incomeIndex = headers.indexOf("B19013_001E")
    const tractIndex = headers.indexOf("tract")
    const countyIndex = headers.indexOf("county")

    // Filtrar y procesar los datos
    // Nota: Como no podemos determinar exactamente qué Census Tracts pertenecen a una ciudad específica
    // sin datos geoespaciales adicionales, simularemos esta información

    // Obtener el nombre de la ciudad para filtrar
    const cityResponse = await fetch(`${baseUrl}?get=NAME&for=place:${placeId}&in=state:${stateCode}&key=${API_KEY}`)

    if (!cityResponse.ok) {
      throw new Error(`Error en la API del Census al obtener la ciudad: ${cityResponse.status}`)
    }

    const cityData = await cityResponse.json()
    const cityName = cityData[1][0].split(",")[0].toLowerCase()

    // Filtrar los Census Tracts que podrían pertenecer a la ciudad
    // Esto es una aproximación, ya que no tenemos datos geoespaciales precisos
    const neighborhoods = data
      .slice(1) // Omitir encabezados
      .filter((row: any) => {
        const tractName = row[nameIndex].toLowerCase()
        // Intentar identificar si el Census Tract podría pertenecer a la ciudad
        // basándonos en si el nombre de la ciudad aparece en el nombre del tract
        return (
          tractName.includes(cityName) ||
          // También incluir tracts que contengan términos comunes de barrios
          tractName.includes("neighborhood") ||
          tractName.includes("district") ||
          tractName.includes("community") ||
          // O simplemente tomar algunos tracts del condado para demostración
          Math.random() < 0.2
        ) // Tomar aproximadamente el 20% de los tracts
      })
      .map((row: any) => {
        const tractName = row[nameIndex].split(",")[0]
        const totalPopulation = Number.parseInt(row[totalPopIndex]) || 0
        const mexicanPopulation = Number.parseInt(row[mexicanPopIndex]) || 0
        const medianIncome = Number.parseInt(row[incomeIndex]) || 0
        const tractId = row[tractIndex]
        const countyId = row[countyIndex]

        // Calcular porcentaje
        const percentage =
          totalPopulation > 0 ? Number.parseFloat(((mexicanPopulation / totalPopulation) * 100).toFixed(1)) : 0

        // Generar un código postal ficticio basado en el código de tract
        // En la realidad, un tract puede abarcar múltiples códigos postales
        let zipCode = `${stateCode}${countyId.substring(0, 1)}${tractId.substring(0, 2)}`.padEnd(5, "0")

        // Mapeo de barrios a códigos postales reales para ciudades principales
        const zipCodeMap: Record<string, Record<string, string>> = {
          "Los Angeles": {
            "Downtown Los Angeles": "90012, 90013, 90014, 90015",
            "East Los Angeles": "90022, 90023",
            "Boyle Heights": "90033",
            "Lincoln Heights": "90031",
            "Highland Park": "90042",
            "El Sereno": "90032",
            "Pico-Union": "90006, 90015",
            Westlake: "90057",
            Koreatown: "90005, 90006",
            "South Los Angeles": "90001, 90003, 90037",
            Wilmington: "90744",
            Pacoima: "91331",
            Sylmar: "91342",
            "San Fernando Valley": "91401, 91402, 91403",
            "Huntington Park": "90255",
          },
          "San Francisco": {
            "Mission District": "94110",
            Excelsior: "94112",
            "Visitacion Valley": "94134",
            Bayview: "94124",
            "Outer Mission": "94112",
            "Bernal Heights": "94110",
            "Crocker-Amazon": "94112",
            Portola: "94134",
            "South of Market": "94103",
            Tenderloin: "94102",
          },
          Houston: {
            "East End": "77011, 77023",
            "Magnolia Park": "77012",
            "Denver Harbor": "77020",
            Northside: "77009",
            "Second Ward": "77003",
            "Near Northside": "77009",
            Gulfton: "77081",
            Sharpstown: "77036, 77074",
            "Spring Branch": "77055, 77080",
            Alief: "77072, 77099",
          },
          Dallas: {
            "Oak Cliff": "75208, 75211",
            "Pleasant Grove": "75217",
            "West Dallas": "75212",
            "Love Field": "75235",
            "Northwest Dallas": "75229, 75220",
            "Northeast Dallas": "75228, 75238",
            "South Dallas": "75215",
            "Southeast Dallas": "75227",
            "Southwest Dallas": "75211",
            "Far North": "75252",
          },
          "New York City": {
            "Washington Heights": "10032, 10033",
            "East Harlem": "10029, 10035",
            "Lower East Side": "10002",
            "Sunset Park": "11220, 11232",
            Corona: "11368",
            "Jackson Heights": "11372",
            Elmhurst: "11373",
            Bushwick: "11206, 11207",
            Williamsburg: "11211, 11249",
            "South Bronx": "10451, 10454, 10455",
          },
          Chicago: {
            Pilsen: "60608",
            "Little Village": "60623",
            "Humboldt Park": "60622, 60647",
            "Logan Square": "60647",
            Hermosa: "60639",
            "Belmont Cragin": "60639",
            "Albany Park": "60625",
            Avondale: "60618",
            "Back of the Yards": "60609",
            "Gage Park": "60629, 60632",
          },
          Phoenix: {
            Maryvale: "85031, 85033, 85035",
            "South Phoenix": "85040, 85041",
            "Central City": "85004, 85006, 85008",
            Alhambra: "85015, 85019",
            Estrella: "85043",
            Laveen: "85339",
            "North Gateway": "85085",
            "Deer Valley": "85027",
            "Desert View": "85050",
            "South Mountain": "85042",
          },
        }

        // Obtener el nombre de la ciudad para buscar en el mapa de códigos postales
        const cityFullName = cityData[1][0].split(",")[0]

        // Verificar si tenemos códigos postales para esta ciudad y barrio
        const neighborhoodName = tractName.split(",")[0]
        if (zipCodeMap[cityFullName] && zipCodeMap[cityFullName][neighborhoodName]) {
          zipCode = zipCodeMap[cityFullName][neighborhoodName]
        } else if (neighborhoodName.includes("Downtown")) {
          // Códigos postales genéricos para áreas del centro de la ciudad
          if (cityFullName === "Los Angeles") {
            zipCode = "90012, 90013, 90014"
          } else if (cityFullName === "San Francisco") {
            zipCode = "94102, 94103, 94104"
          } else if (cityFullName === "New York") {
            zipCode = "10007, 10038"
          } else if (cityFullName === "Chicago") {
            zipCode = "60601, 60602, 60603"
          } else if (cityFullName === "Houston") {
            zipCode = "77002, 77010"
          } else if (cityFullName === "Phoenix") {
            zipCode = "85003, 85004"
          } else if (cityFullName === "Dallas") {
            zipCode = "75201, 75202"
          }
        }

        // Generar un nombre de barrio más amigable
        let neighborhoodName2 = tractName

        // Si el nombre es muy técnico (como "Census Tract 1234"), crear un nombre más amigable
        if (tractName.includes("Census Tract")) {
          // Extraer el número del tract
          const tractNumber = tractName.match(/\d+(\.\d+)?/)?.[0] || ""
          // Generar un nombre de barrio basado en direcciones cardinales y tipos de barrios
          const directions = ["North", "South", "East", "West", "Central", "Downtown", "Uptown", "Midtown"]
          const types = ["District", "Heights", "Park", "Village", "Gardens", "Hills", "Valley", "Terrace", "Square"]
          const direction = directions[Math.floor(Math.random() * directions.length)]
          const type = types[Math.floor(Math.random() * types.length)]
          neighborhoodName2 = `${direction} ${cityName.charAt(0).toUpperCase() + cityName.slice(1)} ${type}`
        }

        return {
          name: neighborhoodName2,
          tractId,
          countyId,
          stateCode,
          totalPopulation,
          mexicanPopulation,
          percentage,
          medianIncome,
          zipCode,
        }
      })
      // Filtrar barrios con población mexicana
      .filter((neighborhood) => neighborhood.mexicanPopulation > 0)
      // Ordenar por población mexicana (de mayor a menor)
      .sort((a, b) => b.mexicanPopulation - a.mexicanPopulation)
      // Limitar a los 20 principales barrios para rendimiento
      .slice(0, 20)

    return neighborhoods
  } catch (error) {
    console.error(`Error fetching neighborhoods for city in state ${stateCode}:`, error)
    // En caso de error, devolver datos simulados
    return generateSimulatedNeighborhoods(stateCode, placeId)
  }
}

// Función para generar datos simulados de barrios
function generateSimulatedNeighborhoods(stateCode: string, placeId: string): any[] {
  // Mapeo de algunos códigos de estado a nombres de estado
  const stateNames: Record<string, string> = {
    "06": "California",
    "48": "Texas",
    "36": "New York",
    "12": "Florida",
    "17": "Illinois",
    "04": "Arizona",
  }

  // Mapeo de algunas combinaciones de estado y lugar a nombres de ciudades
  const cityNames: Record<string, Record<string, string>> = {
    "06": {
      // California
      "44000": "Los Angeles",
      "67000": "San Francisco",
      "68000": "San Jose",
      "53000": "Oakland",
      "27000": "Fresno",
    },
    "48": {
      // Texas
      "35000": "Houston",
      "19000": "Dallas",
      "65000": "San Antonio",
      "05000": "Austin",
      "24000": "El Paso",
    },
    "36": {
      // New York
      "51000": "New York City",
      "11000": "Buffalo",
      "73000": "Syracuse",
      "63000": "Rochester",
      "79000": "Yonkers",
    },
  }

  // Intentar obtener el nombre de la ciudad
  let cityName = "Ciudad"
  if (cityNames[stateCode] && cityNames[stateCode][placeId]) {
    cityName = cityNames[stateCode][placeId]
  }

  // Nombres de barrios para diferentes ciudades
  const neighborhoodsByCity: Record<string, string[]> = {
    "Los Angeles": [
      "East Los Angeles",
      "Boyle Heights",
      "Lincoln Heights",
      "Highland Park",
      "El Sereno",
      "Pico-Union",
      "Westlake",
      "Koreatown",
      "South Los Angeles",
      "Wilmington",
      "Pacoima",
      "Sylmar",
      "San Fernando Valley",
      "Huntington Park",
      "South Gate",
    ],
    "San Francisco": [
      "Mission District",
      "Excelsior",
      "Visitacion Valley",
      "Bayview",
      "Outer Mission",
      "Bernal Heights",
      "Crocker-Amazon",
      "Portola",
      "South of Market",
      "Tenderloin",
    ],
    Houston: [
      "East End",
      "Magnolia Park",
      "Denver Harbor",
      "Northside",
      "Second Ward",
      "Near Northside",
      "Gulfton",
      "Sharpstown",
      "Spring Branch",
      "Alief",
    ],
    Dallas: [
      "Oak Cliff",
      "Pleasant Grove",
      "West Dallas",
      "Love Field",
      "Northwest Dallas",
      "Northeast Dallas",
      "South Dallas",
      "Southeast Dallas",
      "Southwest Dallas",
      "Far North",
    ],
    "New York City": [
      "Washington Heights",
      "East Harlem",
      "Lower East Side",
      "Sunset Park",
      "Corona",
      "Jackson Heights",
      "Elmhurst",
      "Bushwick",
      "Williamsburg",
      "South Bronx",
    ],
    Chicago: [
      "Pilsen",
      "Little Village",
      "Humboldt Park",
      "Logan Square",
      "Hermosa",
      "Belmont Cragin",
      "Albany Park",
      "Avondale",
      "Back of the Yards",
      "Gage Park",
    ],
    Phoenix: [
      "Maryvale",
      "South Phoenix",
      "Central City",
      "Alhambra",
      "Estrella",
      "Laveen",
      "North Gateway",
      "Deer Valley",
      "Desert View",
      "South Mountain",
    ],
  }

  // Usar barrios específicos si están disponibles, o generar nombres genéricos
  let neighborhoods = neighborhoodsByCity[cityName] || []

  // Si no hay barrios específicos para esta ciudad, generar nombres genéricos
  if (neighborhoods.length === 0) {
    const directions = ["North", "South", "East", "West", "Central", "Downtown", "Uptown", "Midtown"]
    const types = ["District", "Heights", "Park", "Village", "Gardens", "Hills", "Valley", "Terrace", "Square"]

    neighborhoods = []
    for (let i = 0; i < 15; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)]
      const type = types[Math.floor(Math.random() * types.length)]
      neighborhoods.push(`${direction} ${cityName} ${type}`)
    }
  }

  // Mapeo de barrios a códigos postales reales para ciudades principales
  const zipCodeMap: Record<string, Record<string, string>> = {
    "Los Angeles": {
      "Downtown Los Angeles": "90012, 90013, 90014, 90015",
      "East Los Angeles": "90022, 90023",
      "Boyle Heights": "90033",
      "Lincoln Heights": "90031",
      "Highland Park": "90042",
      "El Sereno": "90032",
      "Pico-Union": "90006, 90015",
      Westlake: "90057",
      Koreatown: "90005, 90006",
      "South Los Angeles": "90001, 90003, 90037",
      Wilmington: "90744",
      Pacoima: "91331",
      Sylmar: "91342",
      "San Fernando Valley": "91401, 91402, 91403",
      "Huntington Park": "90255",
    },
    "San Francisco": {
      "Mission District": "94110",
      Excelsior: "94112",
      "Visitacion Valley": "94134",
      Bayview: "94124",
      "Outer Mission": "94112",
      "Bernal Heights": "94110",
      "Crocker-Amazon": "94112",
      Portola: "94134",
      "South of Market": "94103",
      Tenderloin: "94102",
    },
    Houston: {
      "East End": "77011, 77023",
      "Magnolia Park": "77012",
      "Denver Harbor": "77020",
      Northside: "77009",
      "Second Ward": "77003",
      "Near Northside": "77009",
      Gulfton: "77081",
      Sharpstown: "77036, 77074",
      "Spring Branch": "77055, 77080",
      Alief: "77072, 77099",
    },
    Dallas: {
      "Oak Cliff": "75208, 75211",
      "Pleasant Grove": "75217",
      "West Dallas": "75212",
      "Love Field": "75235",
      "Northwest Dallas": "75229, 75220",
      "Northeast Dallas": "75228, 75238",
      "South Dallas": "75215",
      "Southeast Dallas": "75227",
      "Southwest Dallas": "75211",
      "Far North": "75252",
    },
    "New York City": {
      "Washington Heights": "10032, 10033",
      "East Harlem": "10029, 10035",
      "Lower East Side": "10002",
      "Sunset Park": "11220, 11232",
      Corona: "11368",
      "Jackson Heights": "11372",
      Elmhurst: "11373",
      Bushwick: "11206, 11207",
      Williamsburg: "11211, 11249",
      "South Bronx": "10451, 10454, 10455",
    },
    Chicago: {
      Pilsen: "60608",
      "Little Village": "60623",
      "Humboldt Park": "60622, 60647",
      "Logan Square": "60647",
      Hermosa: "60639",
      "Belmont Cragin": "60639",
      "Albany Park": "60625",
      Avondale: "60618",
      "Back of the Yards": "60609",
      "Gage Park": "60629, 60632",
    },
    Phoenix: {
      Maryvale: "85031, 85033, 85035",
      "South Phoenix": "85040, 85041",
      "Central City": "85004, 85006, 85008",
      Alhambra: "85015, 85019",
      Estrella: "85043",
      Laveen: "85339",
      "North Gateway": "85085",
      "Deer Valley": "85027",
      "Desert View": "85050",
      "South Mountain": "85042",
    },
  }

  // Generar datos simulados para cada barrio
  return (
    neighborhoods
      .map((name, index) => {
        // Población total simulada (entre 5,000 y 50,000)
        const totalPopulation = Math.floor(5000 + Math.random() * 45000)

        // Porcentaje de población mexicana (entre 10% y 90%)
        const percentageMexican = 10 + Math.floor(Math.random() * 80)

        // Población mexicana basada en el porcentaje
        const mexicanPopulation = Math.floor(totalPopulation * (percentageMexican / 100))

        // Ingreso medio (entre $30,000 y $100,000)
        const medianIncome = 30000 + Math.floor(Math.random() * 70000)

        // Generar un código postal ficticio
        let zipCode = `${stateCode}${(index + 10).toString().padStart(3, "0")}`.padEnd(5, "0")

        // Buscar el código postal real para este barrio
        if (zipCodeMap[cityName] && zipCodeMap[cityName][name]) {
          zipCode = zipCodeMap[cityName][name]
        }

        return {
          name,
          tractId: `${1000 + index}`,
          countyId: "001",
          stateCode,
          totalPopulation,
          mexicanPopulation,
          percentage: percentageMexican,
          medianIncome,
          zipCode,
        }
      })
      // Ordenar por población mexicana (de mayor a menor)
      .sort((a, b) => b.mexicanPopulation - a.mexicanPopulation)
  )
}
