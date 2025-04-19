"use client"

import { useState } from "react"
import { Search, Loader2, AlertCircle, Download, BarChart } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { fetchDataByZipCode, fetchLocationSpecificData, fetchNeighborhoodsByCity } from "@/lib/census-api"
import { NeighborhoodExplorer } from "@/components/neighborhood-explorer"

// Lista de estados de EE.UU. con sus códigos
const US_STATES = [
  { name: "Alabama", code: "01" },
  { name: "Alaska", code: "02" },
  { name: "Arizona", code: "04" },
  { name: "Arkansas", code: "05" },
  { name: "California", code: "06" },
  { name: "Colorado", code: "08" },
  { name: "Connecticut", code: "09" },
  { name: "Delaware", code: "10" },
  { name: "District of Columbia", code: "11" },
  { name: "Florida", code: "12" },
  { name: "Georgia", code: "13" },
  { name: "Hawaii", code: "15" },
  { name: "Idaho", code: "16" },
  { name: "Illinois", code: "17" },
  { name: "Indiana", code: "18" },
  { name: "Iowa", code: "19" },
  { name: "Kansas", code: "20" },
  { name: "Kentucky", code: "21" },
  { name: "Louisiana", code: "22" },
  { name: "Maine", code: "23" },
  { name: "Maryland", code: "24" },
  { name: "Massachusetts", code: "25" },
  { name: "Michigan", code: "26" },
  { name: "Minnesota", code: "27" },
  { name: "Mississippi", code: "28" },
  { name: "Missouri", code: "29" },
  { name: "Montana", code: "30" },
  { name: "Nebraska", code: "31" },
  { name: "Nevada", code: "32" },
  { name: "New Hampshire", code: "33" },
  { name: "New Jersey", code: "34" },
  { name: "New Mexico", code: "35" },
  { name: "New York", code: "36" },
  { name: "North Carolina", code: "37" },
  { name: "North Dakota", code: "38" },
  { name: "Ohio", code: "39" },
  { name: "Oklahoma", code: "40" },
  { name: "Oregon", code: "41" },
  { name: "Pennsylvania", code: "42" },
  { name: "Rhode Island", code: "44" },
  { name: "South Carolina", code: "45" },
  { name: "South Dakota", code: "46" },
  { name: "Tennessee", code: "47" },
  { name: "Texas", code: "48" },
  { name: "Utah", code: "49" },
  { name: "Vermont", code: "50" },
  { name: "Virginia", code: "51" },
  { name: "Washington", code: "53" },
  { name: "West Virginia", code: "54" },
  { name: "Wisconsin", code: "55" },
  { name: "Wyoming", code: "56" },
]

// Estados con mayor población mexicana para sugerir en la comparación
const SUGGESTED_STATES = [
  { name: "California", code: "06" },
  { name: "Texas", code: "48" },
  { name: "Arizona", code: "04" },
  { name: "Illinois", code: "17" },
  { name: "Colorado", code: "08" },
  { name: "New Mexico", code: "35" },
  { name: "Nevada", code: "32" },
  { name: "Washington", code: "53" },
  { name: "Florida", code: "12" },
  { name: "Georgia", code: "13" },
]

export function SpecificSearch() {
  const [searchType, setSearchType] = useState<
    "zipcode" | "location" | "city" | "state" | "neighborhood" | "topCities" | "compareStates"
  >("zipcode")
  const [topCitiesCount, setTopCitiesCount] = useState(10)
  const [topCitiesResults, setTopCitiesResults] = useState<any[]>([])
  const [isLoadingStates, setIsLoadingStates] = useState(false)
  const [loadedStatesCount, setLoadedStatesCount] = useState(0)
  const [totalStatesCount, setTotalStatesCount] = useState(0)
  const [zipCode, setZipCode] = useState("")
  const [stateCode, setStateCode] = useState("")
  const [placeId, setPlaceId] = useState("")
  const [cityName, setCityName] = useState("")
  const [selectedState, setSelectedState] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
  const [stateCitiesResults, setStateCitiesResults] = useState<any[]>([])
  const [selectedCityData, setSelectedCityData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRawData, setShowRawData] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState({
    name: true,
    stateName: false,
    mexicanPopulation: false,
    percentage: false,
    medianIncome: false,
  })
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])

  // Estados para la comparación de estados
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [stateComparisonData, setStateComparisonData] = useState<any[]>([])
  const [comparisonMetric, setComparisonMetric] = useState<"population" | "percentage" | "cities">("population")
  const [isLoadingComparison, setIsLoadingComparison] = useState(false)

  // Validar código postal
  const validateZipCode = (zip: string): boolean => {
    return /^\d{5}$/.test(zip)
  }

  // Validar código de estado
  const validateStateCode = (state: string): boolean => {
    return /^\d{2}$/.test(state)
  }

  // Validar ID de lugar
  const validatePlaceId = (place: string): boolean => {
    return /^\d+$/.test(place)
  }

  // Función para normalizar nombres de barrios
  const normalizeNeighborhoodName = (name: string): string => {
    // Lista de sufijos comunes a eliminar
    const suffixesToRemove = [
      " Park",
      " Valley",
      " Heights",
      " Hills",
      " Gardens",
      " District",
      " Area",
      " Zone",
      " Community",
      " Neighborhood",
      " Square",
      " Terrace",
      " North",
      " South",
      " East",
      " West",
      " Central",
      " Downtown",
      " Uptown",
    ]

    // Normalizar el nombre eliminando sufijos
    let normalizedName = name

    // Primero intentar encontrar el nombre base (como "East Los Angeles")
    const baseNameMatch = name.match(
      /(North|South|East|West|Central|Downtown|Uptown)?\s?([A-Za-z\s]+?)(?:\s(?:Park|Valley|Heights|Hills|Gardens|District|Area|Zone|Community|Neighborhood|Square|Terrace))?$/,
    )

    if (baseNameMatch && baseNameMatch[2]) {
      // Si encontramos un nombre base, usarlo como nombre normalizado
      normalizedName = (baseNameMatch[1] ? baseNameMatch[1] + " " : "") + baseNameMatch[2].trim()
    } else {
      // Si no encontramos un patrón claro, eliminar sufijos conocidos
      for (const suffix of suffixesToRemove) {
        if (normalizedName.endsWith(suffix)) {
          normalizedName = normalizedName.slice(0, -suffix.length).trim()
          break
        }
      }
    }

    return normalizedName
  }

  // Función para añadir o quitar un estado de la selección
  const toggleStateSelection = (stateCode: string) => {
    if (selectedStates.includes(stateCode)) {
      setSelectedStates(selectedStates.filter((code) => code !== stateCode))
    } else {
      setSelectedStates([...selectedStates, stateCode])
    }
  }

  // Función para obtener datos de comparación entre estados
  const fetchStateComparisonData = async () => {
    if (selectedStates.length === 0) {
      setError("Por favor, selecciona al menos un estado para comparar")
      return
    }

    setIsLoadingComparison(true)
    setError(null)
    setStateComparisonData([])

    try {
      const API_KEY = localStorage.getItem("census_api_key") || process.env.CENSUS_API_KEY

      if (!API_KEY) {
        throw new Error("Census API key is not available")
      }

      const baseUrl = "https://api.census.gov/data/2021/acs/acs5"

      // Variables para datos demográficos por estado
      const variables = [
        "B03001_001E", // Total population
        "B03001_004E", // Mexican population
        "B19013_001E", // Median household income
      ].join(",")

      // Obtener datos para cada estado seleccionado
      const stateDataPromises = selectedStates.map(async (stateCode) => {
        try {
          // Obtener datos a nivel de estado
          const stateUrl = `${baseUrl}?get=${variables},NAME&for=state:${stateCode}&key=${API_KEY}`
          const stateResponse = await fetch(stateUrl)

          if (!stateResponse.ok) {
            throw new Error(`Error en la API del Census para el estado ${stateCode}: ${stateResponse.status}`)
          }

          const stateData = await stateResponse.json()

          // Obtener datos de ciudades para este estado
          const citiesUrl = `${baseUrl}?get=${variables},NAME&for=place:*&in=state:${stateCode}&key=${API_KEY}`
          const citiesResponse = await fetch(citiesUrl)

          if (!citiesResponse.ok) {
            throw new Error(
              `Error en la API del Census para ciudades del estado ${stateCode}: ${citiesResponse.status}`,
            )
          }

          const citiesData = await citiesResponse.json()

          // Procesar datos del estado
          const stateHeaders = stateData[0]
          const stateValues = stateData[1]

          const nameIndex = stateHeaders.indexOf("NAME")
          const totalPopIndex = stateHeaders.indexOf("B03001_001E")
          const mexicanPopIndex = stateHeaders.indexOf("B03001_004E")
          const incomeIndex = stateHeaders.indexOf("B19013_001E")

          const stateName = stateValues[nameIndex]
          const totalPopulation = Number.parseInt(stateValues[totalPopIndex]) || 0
          const mexicanPopulation = Number.parseInt(stateValues[mexicanPopIndex]) || 0
          const medianIncome = Number.parseInt(stateValues[incomeIndex]) || 0

          // Calcular porcentaje
          const percentage =
            totalPopulation > 0 ? Number.parseFloat(((mexicanPopulation / totalPopulation) * 100).toFixed(1)) : 0

          // Procesar datos de ciudades
          const citiesHeaders = citiesData[0]
          const citiesNameIndex = citiesHeaders.indexOf("NAME")
          const citiesTotalPopIndex = citiesHeaders.indexOf("B03001_001E")
          const citiesMexicanPopIndex = citiesHeaders.indexOf("B03001_004E")

          // Filtrar y procesar ciudades con población mexicana
          const citiesWithMexicanPop = citiesData
            .slice(1) // Omitir encabezados
            .map((row: any) => {
              const cityName = row[citiesNameIndex].split(",")[0]
              const cityTotalPop = Number.parseInt(row[citiesTotalPopIndex]) || 0
              const cityMexicanPop = Number.parseInt(row[citiesMexicanPopIndex]) || 0

              return {
                name: cityName,
                totalPopulation: cityTotalPop,
                mexicanPopulation: cityMexicanPop,
                percentage:
                  cityTotalPop > 0 ? Number.parseFloat(((cityMexicanPop / cityTotalPop) * 100).toFixed(1)) : 0,
              }
            })
            .filter((city: any) => city.mexicanPopulation > 0)
            .sort((a: any, b: any) => b.mexicanPopulation - a.mexicanPopulation)

          // Obtener el nombre completo del estado
          const stateInfo = US_STATES.find((state) => state.code === stateCode)

          return {
            stateCode,
            stateName: stateInfo?.name || stateName,
            totalPopulation,
            mexicanPopulation,
            percentage,
            medianIncome,
            citiesCount: citiesWithMexicanPop.length,
            topCities: citiesWithMexicanPop.slice(0, 5), // Top 5 ciudades
            averageCityPercentage:
              citiesWithMexicanPop.length > 0
                ? Number.parseFloat(
                    (
                      citiesWithMexicanPop.reduce((sum, city) => sum + city.percentage, 0) / citiesWithMexicanPop.length
                    ).toFixed(1),
                  )
                : 0,
          }
        } catch (error) {
          console.error(`Error obteniendo datos para el estado ${stateCode}:`, error)
          // Devolver datos parciales en caso de error
          return {
            stateCode,
            stateName: US_STATES.find((state) => state.code === stateCode)?.name || "Desconocido",
            totalPopulation: 0,
            mexicanPopulation: 0,
            percentage: 0,
            medianIncome: 0,
            citiesCount: 0,
            topCities: [],
            averageCityPercentage: 0,
            error: true,
          }
        }
      })

      // Esperar a que se completen todas las solicitudes
      const statesData = await Promise.all(stateDataPromises)

      // Ordenar según la métrica seleccionada
      let sortedData
      switch (comparisonMetric) {
        case "population":
          sortedData = statesData.sort((a, b) => b.mexicanPopulation - a.mexicanPopulation)
          break
        case "percentage":
          sortedData = statesData.sort((a, b) => b.percentage - a.percentage)
          break
        case "cities":
          sortedData = statesData.sort((a, b) => b.citiesCount - a.citiesCount)
          break
        default:
          sortedData = statesData
      }

      setStateComparisonData(sortedData)
    } catch (error) {
      console.error("Error en la comparación de estados:", error)
      setError(error instanceof Error ? error.message : "Error desconocido en la comparación")
    } finally {
      setIsLoadingComparison(false)
    }
  }

  const searchByCity = async (city: string): Promise<any> => {
    if (!city.trim()) {
      throw new Error("Por favor, ingresa un nombre de ciudad")
    }

    const API_KEY = localStorage.getItem("census_api_key") || process.env.CENSUS_API_KEY

    if (!API_KEY) {
      throw new Error("Census API key is not available")
    }

    // Vamos a usar un enfoque diferente: buscar primero en una lista de ciudades conocidas
    // con sus códigos de estado y place IDs
    const commonCities = [
      { name: "miami", state: "12", place: "45000" }, // Miami, FL
      { name: "los angeles", state: "06", place: "44000" }, // Los Angeles, CA
      { name: "new york", state: "36", place: "51000" }, // New York, NY
      { name: "chicago", state: "17", place: "14000" }, // Chicago, IL
      { name: "houston", state: "48", place: "35000" }, // Houston, TX
      { name: "phoenix", state: "04", place: "55000" }, // Phoenix, AZ
      { name: "philadelphia", state: "42", place: "60000" }, // Philadelphia, PA
      { name: "san antonio", state: "48", place: "65000" }, // San Antonio, TX
      { name: "dallas", state: "48", place: "19000" }, // Dallas, TX
      { name: "san jose", state: "06", place: "68000" }, // San Jose, CA
      { name: "austin", state: "48", place: "05000" }, // Austin, TX
      { name: "jacksonville", state: "12", place: "35000" }, // Jacksonville, FL
      { name: "san francisco", state: "06", place: "67000" }, // San Francisco, CA
      { name: "columbus", state: "39", place: "18000" }, // Columbus, OH
      { name: "indianapolis", state: "18", place: "36000" }, // Indianapolis, IN
      { name: "seattle", state: "53", place: "63000" }, // Seattle, WA
      { name: "denver", state: "08", place: "20000" }, // Denver, CO
      { name: "washington", state: "11", place: "50000" }, // Washington, DC
      { name: "boston", state: "25", place: "07000" }, // Boston, MA
      { name: "el paso", state: "48", place: "24000" }, // El Paso, TX
      { name: "nashville", state: "47", place: "52006" }, // Nashville, TN
      { name: "detroit", state: "26", place: "22000" }, // Detroit, MI
      { name: "oklahoma city", state: "40", place: "55000" }, // Oklahoma City, OK
      { name: "portland", state: "41", place: "59000" }, // Portland, OR
      { name: "las vegas", state: "32", place: "40000" }, // Las Vegas, NV
      { name: "memphis", state: "47", place: "48000" }, // Memphis, TN
      { name: "louisville", state: "21", place: "48000" }, // Louisville, KY
      { name: "baltimore", state: "24", place: "04000" }, // Baltimore, MD
      { name: "milwaukee", state: "55", place: "53000" }, // Milwaukee, WI
      { name: "albuquerque", state: "35", place: "02000" }, // Albuquerque, NM
      { name: "tucson", state: "04", place: "77000" }, // Tucson, AZ
      { name: "fresno", state: "06", place: "27000" }, // Fresno, CA
      { name: "sacramento", state: "06", place: "64000" }, // Sacramento, CA
      { name: "mesa", state: "04", place: "46000" }, // Mesa, AZ
      { name: "atlanta", state: "13", place: "04000" }, // Atlanta, GA
    ]

    // Buscar en la lista de ciudades conocidas
    const normalizedCityName = city.toLowerCase().trim()
    const cityMatch = commonCities.find(
      (c) =>
        c.name === normalizedCityName || c.name.includes(normalizedCityName) || normalizedCityName.includes(c.name),
    )

    if (cityMatch) {
      console.log(
        `Ciudad encontrada en la lista predefinida: ${cityMatch.name}, state: ${cityMatch.state}, place: ${cityMatch.place}`,
      )
      return fetchLocationSpecificData(cityMatch.state, cityMatch.place)
    }

    // Si no se encuentra en la lista predefinida, intentar una búsqueda más específica
    try {
      // Intentar buscar la ciudad directamente por su nombre
      const baseUrl = "https://api.census.gov/data/2021/acs/acs5"

      // Construir la URL para buscar datos específicos
      // Usamos variables básicas para minimizar errores
      const variables = [
        "B03001_001E", // Total population
        "B03001_004E", // Mexican population
        "B19013_001E", // Median household income
      ].join(",")

      // Buscar en todos los estados para encontrar la ciudad
      // Nota: Esto es menos eficiente pero más probable que encuentre la ciudad
      const searchUrl = `${baseUrl}?get=${variables},NAME&for=place:*&in=state:*&key=${API_KEY}`

      const response = await fetch(searchUrl)

      if (!response.ok) {
        throw new Error(`Error en la API del Census: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Filtrar los resultados para encontrar lugares que coincidan con el nombre de la ciudad
      const headers = data[0]
      const nameIndex = headers.indexOf("NAME")
      const stateIndex = headers.indexOf("state")
      const placeIndex = headers.indexOf("place")

      const matches = data.slice(1).filter((row: any) => {
        const placeName = row[nameIndex].split(",")[0].toLowerCase()
        return placeName.includes(normalizedCityName) || normalizedCityName.includes(placeName)
      })

      if (matches.length === 0) {
        throw new Error(
          `No se encontraron resultados para "${city}". Intenta con otro nombre de ciudad o verifica la ortografía.`,
        )
      }

      // Usar el primer resultado que coincida
      const match = matches[0]
      const stateCode = match[stateIndex]
      const placeId = match[placeIndex]

      console.log(`Ciudad encontrada en la API: ${match[nameIndex]}, state: ${stateCode}, place: ${placeId}`)

      // Ahora que tenemos el código de estado y el ID de lugar, obtener los datos demográficos
      return fetchLocationSpecificData(stateCode, placeId)
    } catch (error) {
      console.error("Error en la búsqueda por ciudad:", error)

      // Proporcionar un mensaje de error más descriptivo
      throw new Error(
        `No se pudo encontrar datos para "${city}". Por favor, intenta con una ciudad más grande o usa otra opción de búsqueda. Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
      )
    }
  }

  const searchCitiesByState = async (stateCode: string): Promise<any[]> => {
    if (!stateCode) {
      throw new Error("Por favor, selecciona un estado")
    }

    const API_KEY = localStorage.getItem("census_api_key") || process.env.CENSUS_API_KEY

    if (!API_KEY) {
      throw new Error("Census API key is not available")
    }

    try {
      const baseUrl = "https://api.census.gov/data/2021/acs/acs5"

      // Construir la URL para buscar datos específicos
      // Usamos variables básicas para minimizar errores
      const variables = [
        "B03001_001E", // Total population
        "B03001_004E", // Mexican population
        "B19013_001E", // Median household income
      ].join(",")

      // Buscar todas las ciudades del estado seleccionado
      const searchUrl = `${baseUrl}?get=${variables},NAME&for=place:*&in=state:${stateCode}&key=${API_KEY}`

      const response = await fetch(searchUrl)

      if (!response.ok) {
        throw new Error(`Error en la API del Census: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Procesar los resultados
      const headers = data[0]
      const nameIndex = headers.indexOf("NAME")
      const totalPopIndex = headers.indexOf("B03001_001E")
      const mexicanPopIndex = headers.indexOf("B03001_004E")
      const incomeIndex = headers.indexOf("B19013_001E")
      const placeIndex = headers.indexOf("place")

      // Filtrar y procesar los datos
      const processedData = data
        .slice(1) // Omitir encabezados
        .map((row: any) => {
          const fullName = row[nameIndex]
          const placeName = fullName.split(",")[0]
          const totalPopulation = Number.parseInt(row[totalPopIndex]) || 0
          const mexicanPopulation = Number.parseInt(row[mexicanPopIndex]) || 0
          const medianIncome = Number.parseInt(row[incomeIndex]) || 0
          const placeId = row[placeIndex]

          // Calcular porcentaje
          const percentage =
            totalPopulation > 0 ? Number.parseFloat(((mexicanPopulation / totalPopulation) * 100).toFixed(1)) : 0

          return {
            name: placeName,
            stateCode,
            placeId,
            totalPopulation,
            mexicanPopulation,
            percentage,
            medianIncome,
          }
        })
        // Filtrar lugares con población mexicana
        .filter((place) => place.mexicanPopulation > 0)
        // Ordenar por población mexicana (de mayor a menor)
        .sort((a, b) => b.mexicanPopulation - a.mexicanPopulation)
        // Limitar a los 50 principales lugares para rendimiento
        .slice(0, 50)

      return processedData
    } catch (error) {
      console.error(`Error en la búsqueda de ciudades para el estado ${stateCode}:`, error)
      throw new Error(
        `No se pudieron obtener datos para el estado seleccionado. Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      )
    }
  }

  // Función para obtener las principales ciudades con población mexicana de cada estado
  const fetchTopCitiesByState = async () => {
    setIsLoadingStates(true)
    setError(null)
    setTopCitiesResults([])

    try {
      // Filtrar estados con códigos válidos (excluyendo territorios o casos especiales)
      const validStates = US_STATES.filter((state) => !["11", "60", "66", "69", "72", "74", "78"].includes(state.code))

      setTotalStatesCount(validStates.length)
      setLoadedStatesCount(0)

      // Array para almacenar todas las ciudades
      let allTopCities: any[] = []

      // Procesar cada estado
      for (const state of validStates) {
        try {
          // Obtener ciudades para este estado
          const cities = await searchCitiesByState(state.code)

          // Tomar solo las top N ciudades
          const topCities = cities.slice(0, topCitiesCount).map((city) => ({
            ...city,
            stateName: state.name,
          }))

          // Añadir al array general
          allTopCities = [...allTopCities, ...topCities]

          // Actualizar contador de estados procesados
          setLoadedStatesCount((prev) => prev + 1)
        } catch (error) {
          console.error(`Error obteniendo datos para ${state.name}:`, error)
          // Continuar con el siguiente estado
          setLoadedStatesCount((prev) => prev + 1)
        }
      }

      // Ordenar todas las ciudades por población mexicana (de mayor a menor)
      allTopCities.sort((a, b) => b.mexicanPopulation - a.mexicanPopulation)

      // Actualizar el estado con los resultados
      setTopCitiesResults(allTopCities)
    } catch (error) {
      console.error("Error en la búsqueda de top ciudades:", error)
      setError(error instanceof Error ? error.message : "Error desconocido en la búsqueda")
    } finally {
      setIsLoadingStates(false)
    }
  }

  // Función para exportar los datos seleccionados a un archivo CSV
  const exportCityData = () => {
    if (stateCitiesResults.length === 0) return

    // Determinar qué columnas incluir
    const columns = []
    const headers = []

    if (selectedColumns.name) {
      columns.push("name")
      headers.push("Ciudad")
    }
    if (selectedColumns.mexicanPopulation) {
      columns.push("mexicanPopulation")
      headers.push("Población Mexicana")
    }
    if (selectedColumns.percentage) {
      columns.push("percentage")
      headers.push("% del Total")
    }
    if (selectedColumns.medianIncome) {
      columns.push("medianIncome")
      headers.push("Ingreso Medio")
    }

    // Si no hay columnas seleccionadas, no hacer nada
    if (columns.length === 0) return

    // Crear contenido CSV
    let csvContent = headers.join(",") + "\n"

    // Añadir filas de datos
    csvContent += stateCitiesResults
      .map((city) => {
        return columns
          .map((col) => {
            // Formatear valores especiales
            if (col === "percentage") return `${city[col]}%`
            if (col === "medianIncome") return `${city[col]}`
            return city[col]
          })
          .join(",")
      })
      .join("\n")

    // Crear un blob con el contenido CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Crear un enlace para descargar el archivo
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    // Configurar el enlace
    const stateName = US_STATES.find((state) => state.code === selectedState)?.name || "Estado"
    link.setAttribute("href", url)
    link.setAttribute("download", `datos_ciudades_mexicanas_${stateName.toLowerCase().replace(/\s+/g, "_")}.csv`)

    // Añadir el enlace al documento, hacer clic y luego eliminarlo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cerrar el diálogo
    setExportDialogOpen(false)
  }

  // Función para exportar los datos de las top ciudades
  const exportTopCitiesData = () => {
    if (topCitiesResults.length === 0) return

    // Determinar qué columnas incluir
    const columns = []
    const headers = []

    if (selectedColumns.name) {
      columns.push("name")
      headers.push("Ciudad")
    }
    if (selectedColumns.stateName) {
      columns.push("stateName")
      headers.push("Estado")
    }
    if (selectedColumns.mexicanPopulation) {
      columns.push("mexicanPopulation")
      headers.push("Población Mexicana")
    }
    if (selectedColumns.percentage) {
      columns.push("percentage")
      headers.push("% del Total")
    }
    if (selectedColumns.medianIncome) {
      columns.push("medianIncome")
      headers.push("Ingreso Medio")
    }

    // Si no hay columnas seleccionadas, no hacer nada
    if (columns.length === 0) return

    // Crear contenido CSV
    let csvContent = headers.join(",") + "\n"

    // Añadir filas de datos
    csvContent += topCitiesResults
      .map((city) => {
        return columns
          .map((col) => {
            // Formatear valores especiales
            if (col === "percentage") return `${city[col]}%`
            if (col === "medianIncome") return `${city[col]}`
            return city[col]
          })
          .join(",")
      })
      .join("\n")

    // Crear un blob con el contenido CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Crear un enlace para descargar el archivo
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    // Configurar el enlace
    link.setAttribute("href", url)
    link.setAttribute("download", `top_${topCitiesCount}_ciudades_mexicanas_por_estado.csv`)

    // Añadir el enlace al documento, hacer clic y luego eliminarlo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cerrar el diálogo
    setExportDialogOpen(false)
  }

  // Función para exportar los datos de comparación de estados
  const exportStateComparisonData = () => {
    if (stateComparisonData.length === 0) return

    // Crear encabezados para el CSV
    const headers = [
      "Estado",
      "Población Total",
      "Población Mexicana",
      "Porcentaje",
      "Ingreso Medio",
      "Número de Ciudades",
      "Porcentaje Promedio en Ciudades",
    ]

    // Crear contenido CSV
    let csvContent = headers.join(",") + "\n"

    // Añadir filas de datos
    csvContent += stateComparisonData
      .map((state) => {
        return [
          state.stateName,
          state.totalPopulation,
          state.mexicanPopulation,
          `${state.percentage}%`,
          state.medianIncome,
          state.citiesCount,
          `${state.averageCityPercentage}%`,
        ].join(",")
      })
      .join("\n")

    // Crear un blob con el contenido CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Crear un enlace para descargar el archivo
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    // Configurar el enlace
    link.setAttribute("href", url)
    link.setAttribute("download", `comparacion_estados_poblacion_mexicana.csv`)

    // Añadir el enlace al documento, hacer clic y luego eliminarlo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cerrar el diálogo
    setExportDialogOpen(false)
  }

  // Función para renderizar la tabla de ciudades por estado
  const renderStateCitiesTable = () => {
    if (stateCitiesResults.length === 0) return null

    const stateName = US_STATES.find((state) => state.code === selectedState)?.name || "Seleccionado"

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-lg">
            Ciudades con población mexicana en {stateName} ({stateCitiesResults.length})
          </h3>
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                Exportar datos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Exportar datos de ciudades</DialogTitle>
                <DialogDescription>Selecciona las columnas que deseas incluir en el archivo CSV.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-name"
                    checked={selectedColumns.name}
                    onCheckedChange={(checked) => setSelectedColumns({ ...selectedColumns, name: checked === true })}
                  />
                  <Label htmlFor="export-name">Ciudad</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-population"
                    checked={selectedColumns.mexicanPopulation}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, mexicanPopulation: checked === true })
                    }
                  />
                  <Label htmlFor="export-population">Población Mexicana</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-percentage"
                    checked={selectedColumns.percentage}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, percentage: checked === true })
                    }
                  />
                  <Label htmlFor="export-percentage">Porcentaje del Total</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-income"
                    checked={selectedColumns.medianIncome}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, medianIncome: checked === true })
                    }
                  />
                  <Label htmlFor="export-income">Ingreso Medio</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setExportDialogOpen(false)} variant="outline">
                  Cancelar
                </Button>
                <Button type="button" onClick={exportCityData}>
                  Exportar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead className="text-right">Población Mexicana</TableHead>
                <TableHead className="text-right">% del Total</TableHead>
                <TableHead className="text-right">Ingreso Medio</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateCitiesResults.map((city) => (
                <TableRow key={`${city.stateCode}-${city.placeId}`}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell className="text-right">{city.mexicanPopulation.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{city.percentage}%</TableCell>
                  <TableCell className="text-right">${city.medianIncome.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => handleCitySelect(city)} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ver detalles"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedCityData && (
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-2">Detalles de {selectedCityData["Nombre de la Ubicación"]}</h3>
            {renderCityDetails(selectedCityData)}
          </div>
        )}
      </div>
    )
  }

  // Función para renderizar la tabla de top ciudades por estado
  const renderTopCitiesTable = () => {
    if (topCitiesResults.length === 0) return null

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-lg">
            Top {topCitiesCount} ciudades con mayor población mexicana por estado ({topCitiesResults.length} ciudades)
          </h3>
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                Exportar datos
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Exportar datos de ciudades</DialogTitle>
                <DialogDescription>Selecciona las columnas que deseas incluir en el archivo CSV.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-name"
                    checked={selectedColumns.name}
                    onCheckedChange={(checked) => setSelectedColumns({ ...selectedColumns, name: checked === true })}
                  />
                  <Label htmlFor="export-name">Ciudad</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-state"
                    checked={selectedColumns.stateName}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, stateName: checked === true })
                    }
                  />
                  <Label htmlFor="export-state">Estado</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-population"
                    checked={selectedColumns.mexicanPopulation}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, mexicanPopulation: checked === true })
                    }
                  />
                  <Label htmlFor="export-population">Población Mexicana</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-percentage"
                    checked={selectedColumns.percentage}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, percentage: checked === true })
                    }
                  />
                  <Label htmlFor="export-percentage">Porcentaje del Total</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="export-income"
                    checked={selectedColumns.medianIncome}
                    onCheckedChange={(checked) =>
                      setSelectedColumns({ ...selectedColumns, medianIncome: checked === true })
                    }
                  />
                  <Label htmlFor="export-income">Ingreso Medio</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => setExportDialogOpen(false)} variant="outline">
                  Cancelar
                </Button>
                <Button type="button" onClick={exportTopCitiesData}>
                  Exportar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Población Mexicana</TableHead>
                <TableHead className="text-right">% del Total</TableHead>
                <TableHead className="text-right">Ingreso Medio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCitiesResults.map((city) => (
                <TableRow key={`${city.stateCode}-${city.placeId}`}>
                  <TableCell className="font-medium">{city.name}</TableCell>
                  <TableCell>{city.stateName}</TableCell>
                  <TableCell className="text-right">{city.mexicanPopulation.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{city.percentage}%</TableCell>
                  <TableCell className="text-right">${city.medianIncome.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Función para renderizar la tabla de comparación de estados
  const renderStateComparisonTable = () => {
    if (stateComparisonData.length === 0) return null

    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-lg">Comparación de estados ({stateComparisonData.length} estados)</h3>
          <div className="flex items-center gap-2">
            <Select value={comparisonMetric} onValueChange={(value: any) => setComparisonMetric(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="population">Población Mexicana</SelectItem>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="cities">Número de Ciudades</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="flex items-center gap-1" onClick={exportStateComparisonData}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Población Mexicana</TableHead>
                <TableHead className="text-right">% del Total</TableHead>
                <TableHead className="text-right">Ingreso Medio</TableHead>
                <TableHead className="text-right">Ciudades</TableHead>
                <TableHead className="text-right">% Promedio en Ciudades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateComparisonData.map((state) => (
                <TableRow key={state.stateCode} className={state.error ? "bg-red-50" : ""}>
                  <TableCell className="font-medium">{state.stateName}</TableCell>
                  <TableCell className="text-right">{state.mexicanPopulation.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{state.percentage}%</TableCell>
                  <TableCell className="text-right">${state.medianIncome.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{state.citiesCount}</TableCell>
                  <TableCell className="text-right">{state.averageCityPercentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {stateComparisonData.length > 0 && (
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-2">Top 5 ciudades por estado</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stateComparisonData.map((state) => (
                <Card key={state.stateCode} className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-lg">{state.stateName}</CardTitle>
                    <CardDescription>
                      Población mexicana: {state.mexicanPopulation.toLocaleString()} ({state.percentage}%)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {state.topCities.length > 0 ? (
                      <div className="text-sm">
                        <div className="font-medium mb-1">Principales ciudades:</div>
                        <ul className="space-y-1">
                          {state.topCities.map((city: any, index: number) => (
                            <li key={index} className="flex justify-between">
                              <span>{city.name}</span>
                              <span className="text-gray-500">
                                {city.mexicanPopulation.toLocaleString()} ({city.percentage}%)
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No hay datos de ciudades disponibles</div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Función para renderizar los detalles de una ciudad seleccionada
  const renderCityDetails = (cityData: any) => {
    // Filtrar los datos originales si están presentes
    const displayData = { ...cityData }
    const rawData = displayData._datosOriginales
    delete displayData._datosOriginales

    // Agrupar los datos en categorías
    const generalInfo = {}
    const demographicInfo = {}
    const economicInfo = {}
    const educationInfo = {}

    Object.entries(displayData).forEach(([key, value]) => {
      if (
        key.includes("Código") ||
        key.includes("Año") ||
        key.includes("Nombre") ||
        key.includes("Estado") ||
        key.includes("ID")
      ) {
        generalInfo[key] = value
      } else if (key.includes("Población") || key.includes("Porcentaje Mexicano")) {
        demographicInfo[key] = value
      } else if (key.includes("Ingreso")) {
        economicInfo[key] = value
      } else if (key.includes("Educación") || key.includes("Licenciatura") || key.includes("Posgrado")) {
        educationInfo[key] = value
      }
    })

    return (
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="demographic">Demografía</TabsTrigger>
          <TabsTrigger value="economic">Económico</TabsTrigger>
          <TabsTrigger value="education">Educación</TabsTrigger>
          <TabsTrigger value="neighborhoods">Barrios</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium mb-2">Información General</h4>
          <div className="space-y-2">
            {Object.entries(generalInfo).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">{key}:</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="demographic" className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium mb-2">Información Demográfica</h4>
          <div className="space-y-2">
            {Object.entries(demographicInfo).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">{key}:</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="economic" className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium mb-2">Información Económica</h4>
          <div className="space-y-2">
            {Object.entries(economicInfo).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">{key}:</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="education" className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium mb-2">Información Educativa</h4>
          <div className="space-y-2">
            {Object.entries(educationInfo).map(([key, value]) => (
              <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                <div className="font-medium">{key}:</div>
                <div>{String(value)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="neighborhoods" className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium mb-2">Barrios con Población Mexicana</h4>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Estos son los barrios con mayor concentración de población mexicana en esta ciudad.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (cityData && cityData["Código de Estado"] && cityData["ID de Lugar"]) {
                  setIsLoading(true)
                  fetchNeighborhoodsByCity(cityData["Código de Estado"], cityData["ID de Lugar"])
                    .then((fetchedNeighborhoods) => {
                      // Agrupar barrios con nombres similares
                      const groupedNeighborhoods = new Map()

                      fetchedNeighborhoods.forEach((neighborhood) => {
                        const normalizedName = normalizeNeighborhoodName(neighborhood.name)

                        if (groupedNeighborhoods.has(normalizedName)) {
                          // Si ya existe un grupo con este nombre, sumar los datos
                          const existingGroup = groupedNeighborhoods.get(normalizedName)
                          existingGroup.totalPopulation += neighborhood.totalPopulation
                          existingGroup.mexicanPopulation += neighborhood.mexicanPopulation

                          // Añadir el código postal si no está ya incluido
                          if (!existingGroup.zipCode.includes(neighborhood.zipCode)) {
                            existingGroup.zipCode = existingGroup.zipCode + ", " + neighborhood.zipCode
                          }

                          // Recalcular el porcentaje
                          existingGroup.percentage =
                            existingGroup.totalPopulation > 0
                              ? Number.parseFloat(
                                  ((existingGroup.mexicanPopulation / existingGroup.totalPopulation) * 100).toFixed(1),
                                )
                              : 0
                        } else {
                          // Si no existe, crear un nuevo grupo
                          groupedNeighborhoods.set(normalizedName, {
                            ...neighborhood,
                            name: normalizedName, // Usar el nombre normalizado
                          })
                        }
                      })

                      // Convertir el mapa a un array y ordenar por población mexicana
                      const unifiedNeighborhoods = Array.from(groupedNeighborhoods.values()).sort(
                        (a, b) => b.mexicanPopulation - a.mexicanPopulation,
                      )

                      setNeighborhoods(unifiedNeighborhoods)
                      setIsLoading(false)
                    })
                    .catch((error) => {
                      console.error("Error fetching neighborhoods:", error)
                      setError("Error al obtener datos de barrios")
                      setIsLoading(false)
                    })
                }
              }}
              disabled={isLoading || !cityData}
              className="mb-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando barrios...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Cargar datos de barrios
                </>
              )}
            </Button>

            {neighborhoods && neighborhoods.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Barrio</TableHead>
                      <TableHead className="text-right">Población Mexicana</TableHead>
                      <TableHead className="text-right">% del Total</TableHead>
                      <TableHead className="text-right">Código Postal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {neighborhoods.map((neighborhood, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{neighborhood.name}</TableCell>
                        <TableCell className="text-right">{neighborhood.mexicanPopulation.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{neighborhood.percentage}%</TableCell>
                        <TableCell className="text-right">{neighborhood.zipCode}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : neighborhoods && neighborhoods.length === 0 ? (
              <div className="text-center p-4 text-gray-500">No se encontraron datos de barrios para esta ciudad.</div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    )
  }

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    setSearchResults(null)
    setStateCitiesResults([])
    setSelectedCityData(null)
    setTopCitiesResults([])

    try {
      switch (searchType) {
        case "zipcode":
          if (!validateZipCode(zipCode)) {
            throw new Error("Código postal inválido. Debe tener 5 dígitos.")
          }
          const zipCodeResults = await fetchDataByZipCode(zipCode)
          setSearchResults(zipCodeResults)
          break
        case "location":
          if (!validateStateCode(stateCode) || !validatePlaceId(placeId)) {
            throw new Error("Código de estado o ID de lugar inválido.")
          }
          const locationResults = await fetchLocationSpecificData(stateCode, placeId)
          setSearchResults(locationResults)
          break
        case "city":
          const cityResults = await searchByCity(cityName)
          setSearchResults(cityResults)
          break
        case "state":
          if (!selectedState) {
            throw new Error("Por favor, selecciona un estado.")
          }
          const cities = await searchCitiesByState(selectedState)
          setStateCitiesResults(cities)
          break
        default:
          throw new Error("Tipo de búsqueda no válido")
      }
    } catch (err: any) {
      setError(err.message || "Error al realizar la búsqueda")
    } finally {
      setIsLoading(false)
    }
  }

  const renderResults = () => {
    if (!searchResults) return null

    const displayData = { ...searchResults }
    const rawData = displayData._datosOriginales
    delete displayData._datosOriginales

    return (
      <div className="mt-4">
        <h3 className="font-medium text-lg">Resultados de la Búsqueda</h3>
        <Tabs defaultValue="data" className="w-full mt-2">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="data">Datos Demográficos</TabsTrigger>
            <TabsTrigger value="raw">Datos Originales</TabsTrigger>
          </TabsList>
          <TabsContent value="data">
            <div className="space-y-2">
              {Object.entries(displayData).map(([key, value]) => (
                <div key={key} className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">{key}:</div>
                  <div>{String(value)}</div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="raw">
            <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(rawData, null, 2)}</pre>
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  const handleCitySelect = async (city: any) => {
    setIsLoading(true)
    setError(null)
    setSelectedCityData(null)

    try {
      const cityData = await fetchLocationSpecificData(city.stateCode, city.placeId)
      setSelectedCityData(cityData)
    } catch (err: any) {
      setError(err.message || "Error al obtener detalles de la ciudad")
    } finally {
      setIsLoading(false)
    }
  }

  // Renderizar la interfaz de selección de estados para comparación
  const renderStateSelectionInterface = () => {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Selecciona los estados a comparar</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedStates.map((stateCode) => {
              const state = US_STATES.find((s) => s.code === stateCode)
              return (
                <Badge key={stateCode} variant="secondary" className="flex items-center gap-1">
                  {state?.name}
                  <button
                    onClick={() => toggleStateSelection(stateCode)}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )
            })}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {SUGGESTED_STATES.map((state) => (
              <Button
                key={state.code}
                variant={selectedStates.includes(state.code) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleStateSelection(state.code)}
                className="justify-start"
              >
                {state.name}
              </Button>
            ))}
          </div>

          <details className="mt-2">
            <summary className="cursor-pointer text-sm text-gray-500">Ver todos los estados</summary>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {US_STATES.filter((state) => !SUGGESTED_STATES.some((s) => s.code === state.code)).map((state) => (
                <Button
                  key={state.code}
                  variant={selectedStates.includes(state.code) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleStateSelection(state.code)}
                  className="justify-start"
                >
                  {state.name}
                </Button>
              ))}
            </div>
          </details>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Ordenar resultados por</h3>
          <div className="flex gap-2">
            <Button
              variant={comparisonMetric === "population" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonMetric("population")}
            >
              Población Mexicana
            </Button>
            <Button
              variant={comparisonMetric === "percentage" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonMetric("percentage")}
            >
              Porcentaje
            </Button>
            <Button
              variant={comparisonMetric === "cities" ? "default" : "outline"}
              size="sm"
              onClick={() => setComparisonMetric("cities")}
            >
              Número de Ciudades
            </Button>
          </div>
        </div>

        <Button
          onClick={fetchStateComparisonData}
          disabled={isLoadingComparison || selectedStates.length === 0}
          className="w-full"
        >
          {isLoadingComparison ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando datos de comparación...
            </>
          ) : (
            <>
              <BarChart className="h-4 w-4 mr-2" />
              Comparar Estados
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Búsqueda Específica</CardTitle>
        <CardDescription>Busca datos demográficos específicos por código postal o ubicación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button variant={searchType === "zipcode" ? "default" : "outline"} onClick={() => setSearchType("zipcode")}>
            Código Postal
          </Button>
          <Button variant={searchType === "city" ? "default" : "outline"} onClick={() => setSearchType("city")}>
            Ciudad
          </Button>
          <Button variant={searchType === "state" ? "default" : "outline"} onClick={() => setSearchType("state")}>
            Estado
          </Button>
          <Button
            variant={searchType === "neighborhood" ? "default" : "outline"}
            onClick={() => setSearchType("neighborhood")}
          >
            Barrios
          </Button>
          <Button
            variant={searchType === "topCities" ? "default" : "outline"}
            onClick={() => setSearchType("topCities")}
          >
            Top Ciudades
          </Button>
          <Button
            variant={searchType === "compareStates" ? "default" : "outline"}
            onClick={() => setSearchType("compareStates")}
          >
            Comparar Estados
          </Button>
          <Button variant={searchType === "location" ? "default" : "outline"} onClick={() => setSearchType("location")}>
            Ubicación Específica
          </Button>
        </div>

        {searchType === "neighborhood" ? (
          <NeighborhoodExplorer />
        ) : searchType === "compareStates" ? (
          renderStateSelectionInterface()
        ) : searchType === "state" ? (
          <div className="space-y-2">
            <label htmlFor="state-select" className="text-sm font-medium">
              Selecciona un Estado
            </label>
            <div className="flex gap-2">
              <Select value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Muestra todas las ciudades con población mexicana en el estado seleccionado
            </p>
          </div>
        ) : searchType === "topCities" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="top-cities-count" className="text-sm font-medium">
                  Número de ciudades por estado
                </label>
                <span className="text-sm font-medium">{topCitiesCount}</span>
              </div>
              <input
                id="top-cities-count"
                type="range"
                min="1"
                max="20"
                value={topCitiesCount}
                onChange={(e) => setTopCitiesCount(Number.parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecciona cuántas ciudades con mayor población mexicana quieres ver de cada estado
              </p>
            </div>
            <Button onClick={fetchTopCitiesByState} disabled={isLoadingStates} className="w-full">
              {isLoadingStates ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando ({loadedStatesCount}/{totalStatesCount})
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Top Ciudades
                </>
              )}
            </Button>
          </div>
        ) : searchType === "city" ? (
          <div className="space-y-2">
            <label htmlFor="cityname" className="text-sm font-medium">
              Nombre de Ciudad
            </label>
            <div className="flex gap-2">
              <Input
                id="cityname"
                placeholder="Ej: Miami"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Ingresa el nombre de una ciudad en Estados Unidos</p>
          </div>
        ) : searchType === "zipcode" ? (
          <div className="space-y-2">
            <label htmlFor="zipcode" className="text-sm font-medium">
              Código Postal
            </label>
            <div className="flex gap-2">
              <Input
                id="zipcode"
                placeholder="Ej: 90022"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                maxLength={5}
                pattern="\d{5}"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
                Buscar
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Ingresa un código postal de 5 dígitos (formato XXXXX)</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="statecode" className="text-sm font-medium">
                  Código de Estado
                </label>
                <Input
                  id="statecode"
                  placeholder="Ej: 06 (CA)"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  maxLength={2}
                  pattern="\d{2}"
                />
                <p className="text-xs text-gray-500 mt-1">2 dígitos (ej: 06 para CA)</p>
              </div>
              <div>
                <label htmlFor="placeid" className="text-sm font-medium">
                  ID de Lugar
                </label>
                <Input
                  id="placeid"
                  placeholder="Ej: 22230"
                  value={placeId}
                  onChange={(e) => setPlaceId(e.target.value)}
                  pattern="\d+"
                />
                <p className="text-xs text-gray-500 mt-1">Solo dígitos numéricos</p>
              </div>
            </div>
            <Button onClick={handleSearch} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Buscar
            </Button>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {searchResults && renderResults()}
        {stateCitiesResults.length > 0 && renderStateCitiesTable()}
        {topCitiesResults.length > 0 && renderTopCitiesTable()}
        {stateComparisonData.length > 0 && renderStateComparisonTable()}
      </CardContent>
      <CardFooter className="flex flex-col items-start text-xs text-gray-500">
        <p className="mb-1">
          <strong>Estados con mayor población mexicana:</strong> California (06), Texas (48), Arizona (04), Illinois
          (17)
        </p>
        <p className="mb-1">
          <strong>Ejemplos de ciudades:</strong> Miami (FL), Los Angeles (CA), Chicago (IL), Houston (TX)
        </p>
        <p className="mb-1">
          <strong>Ejemplos de códigos postales válidos:</strong> 90022 (East Los Angeles, CA), 78501 (McAllen, TX),
          10001 (New York, NY)
        </p>
      </CardFooter>
    </Card>
  )
}
