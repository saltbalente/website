"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Loader2, Download, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Input } from "@/components/ui/input"
import { fetchLocationSpecificData } from "@/lib/census-api"

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
    "zipcode" | "location" | "city" | "state" | "neighborhood" | "topCities" | "compareStates" | "advancedFilter"
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

  const [advancedFilterState, setAdvancedFilterState] = useState("")
  const [filteredCities, setFilteredCities] = useState<any[]>([])
  const [filterCriteria, setFilterCriteria] = useState<{
    minPopulation: number
    maxPopulation: number
    minPercentage: number
    maxPercentage: number
    minIncome: number
    maxIncome: number
    sortBy: "population" | "percentage" | "income"
    sortOrder: "asc" | "desc"
  }>({
    minPopulation: 0,
    maxPopulation: 1000000,
    minPercentage: 0,
    maxPercentage: 100,
    minIncome: 0,
    maxIncome: 200000,
    sortBy: "population",
    sortOrder: "desc",
  })

  const [cityLimit, setCityLimit] = useState(50)

  // Añadir después de las declaraciones de estado existentes
  const [savedSortConfigs, setSavedSortConfigs] = useState<
    Array<{
      id: string
      name: string
      criteria: Array<{ column: string; direction: "asc" | "desc" }>
      searchType: string
    }>
  >([])
  const [saveConfigDialogOpen, setSaveConfigDialogOpen] = useState(false)
  const [newConfigName, setNewConfigName] = useState("")
  const [loadConfigDialogOpen, setLoadConfigDialogOpen] = useState(false)

  // Reemplazar estas líneas:
  // const [sortColumn, setSortColumn] = useState<string | null>(null)
  // const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  // Por esta estructura:
  const [sortCriteria, setSortCriteria] = useState<Array<{ column: string; direction: "asc" | "desc" }>>([])

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
    // Convertir a minúsculas para comparaciones consistentes
    const lowercaseName = name.toLowerCase()

    // Diccionario de abreviaturas comunes y sus formas completas
    const abbreviations: Record<string, string> = {
      "st.": "saint",
      "st ": "saint ",
      "mt.": "mount",
      "mt ": "mount ",
      "n.": "north",
      "n ": "north ",
      "s.": "south",
      "s ": "south ",
      "e.": "east",
      "e ": "east ",
      "w.": "west",
      "w ": "west ",
      hts: "heights",
      hgts: "heights",
      apt: "apartments",
      apts: "apartments",
      ctr: "center",
      "ctr.": "center",
      vlg: "village",
      "vlg.": "village",
      gdns: "gardens",
      "gdns.": "gardens",
      blvd: "boulevard",
      "blvd.": "boulevard",
      ave: "avenue",
      "ave.": "avenue",
      dr: "drive",
      "dr.": "drive",
      ln: "lane",
      "ln.": "lane",
      rd: "road",
      "rd.": "road",
      pkwy: "parkway",
      "pkwy.": "parkway",
    }

    // Expandir abreviaturas
    let expandedName = lowercaseName
    Object.entries(abbreviations).forEach(([abbr, full]) => {
      expandedName = expandedName.replace(new RegExp(`\\b${abbr}\\b`, "g"), full)
    })

    // Lista de sufijos comunes a eliminar, ordenados del más largo al más corto para evitar eliminaciones parciales
    const suffixesToRemove = [
      " neighborhood",
      " metropolitan area",
      " metropolitan",
      " community",
      " development",
      " subdivision",
      " residential",
      " apartments",
      " apartment",
      " boulevard",
      " district",
      " gardens",
      " heights",
      " village",
      " center",
      " square",
      " valley",
      " estate",
      " estates",
      " terrace",
      " commons",
      " meadows",
      " springs",
      " hills",
      " place",
      " plaza",
      " point",
      " ridge",
      " shores",
      " station",
      " corner",
      " corners",
      " crossing",
      " crossings",
      " landing",
      " landings",
      " manor",
      " manors",
      " oaks",
      " pines",
      " pointe",
      " ranch",
      " ranches",
      " reserve",
      " resort",
      " run",
      " trace",
      " trails",
      " view",
      " views",
      " vista",
      " vistas",
      " walk",
      " way",
      " woods",
      " park",
      " area",
      " zone",
    ]

    // Prefijos direccionales y sus variaciones
    const directionalPrefixes = [
      "north",
      "northern",
      "north east",
      "northeast",
      "north west",
      "northwest",
      "south",
      "southern",
      "south east",
      "southeast",
      "south west",
      "southwest",
      "east",
      "eastern",
      "west",
      "western",
      "central",
      "downtown",
      "uptown",
      "midtown",
      "inner",
      "outer",
      "upper",
      "lower",
      "old",
      "new",
    ]

    // Patrones específicos para tipos de barrios comunes
    const commonPatterns = [
      /^(downtown|uptown|midtown)$/i,
      /^(north|south|east|west|central)\s+(\w+)$/i,
      /^(\w+)\s+(heights|hills|park|gardens|village|district|neighborhood)$/i,
      /^(old|new)\s+(\w+)$/i,
      /^(the)\s+(\w+)$/i,
    ]

    // Intentar extraer el nombre base usando patrones comunes
    let normalizedName = expandedName
    let baseNameFound = false

    // Primero, verificar si el nombre completo coincide con un patrón común
    for (const pattern of commonPatterns) {
      if (pattern.test(expandedName)) {
        const match = expandedName.match(pattern)
        if (match) {
          // Si es un patrón direccional + nombre, mantener ambos
          if (/^(north|south|east|west|central|downtown|uptown|midtown|old|new)$/i.test(match[1])) {
            normalizedName = match[0]
            baseNameFound = true
            break
          }
        }
      }
    }

    // Si no se encontró un patrón común, intentar extraer el nombre base
    if (!baseNameFound) {
      // Buscar un prefijo direccional seguido de un nombre
      const directionalPattern = new RegExp(
        `^(${directionalPrefixes.join("|")})\\s+([\\w\\s]+?)(?:\\s+(?:${suffixesToRemove.map((s) => s.trim()).join("|")}))?$`,
        "i",
      )
      const directionalMatch = expandedName.match(directionalPattern)

      if (directionalMatch) {
        // Mantener el prefijo direccional y el nombre base
        normalizedName = `${directionalMatch[1]} ${directionalMatch[2].trim()}`
      } else {
        // Si no hay prefijo direccional, eliminar sufijos conocidos
        for (const suffix of suffixesToRemove) {
          if (normalizedName.endsWith(suffix)) {
            normalizedName = normalizedName.slice(0, -suffix.length).trim()
            break
          }
        }
      }
    }

    // Eliminar artículos y preposiciones al inicio si quedaron
    normalizedName = normalizedName.replace(/^(the|a|an|of|in|at|by|for)\s+/i, "")

    // Eliminar números y caracteres especiales
    normalizedName = normalizedName.replace(/[0-9#&*()[\]{}]/g, "").trim()

    // Eliminar espacios múltiples
    normalizedName = normalizedName.replace(/\s+/g, " ").trim()

    // Capitalizar cada palabra para un formato consistente
    normalizedName = normalizedName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

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
      // No aplicar slice aquí, ya que ahora controlamos el límite en el filtrado avanzado

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

  // Modifiquemos la función handleSort para manejar múltiples columnas:
  const handleSort = (column: string, isMultiSort = false) => {
    // Crear una copia del array de criterios actual
    let newSortCriteria = [...sortCriteria]

    // Buscar si la columna ya está en los criterios
    const existingCriterionIndex = newSortCriteria.findIndex((c) => c.column === column)

    if (existingCriterionIndex >= 0) {
      // Si la columna ya está en los criterios, invertir su dirección
      const existingCriterion = newSortCriteria[existingCriterionIndex]
      const updatedCriterion = {
        ...existingCriterion,
        direction: existingCriterion.direction === "asc" ? "desc" : "asc",
      }

      // Si no es multi-ordenamiento, eliminar todos los demás criterios
      if (!isMultiSort) {
        newSortCriteria = [updatedCriterion]
      } else {
        // Actualizar el criterio existente manteniendo su posición
        newSortCriteria[existingCriterionIndex] = updatedCriterion
      }
    } else {
      // Si la columna no está en los criterios, añadirla
      const newCriterion = { column, direction: "desc" }

      if (!isMultiSort) {
        // Si no es multi-ordenamiento, reemplazar todos los criterios
        newSortCriteria = [newCriterion]
      } else {
        // Añadir como criterio adicional
        newSortCriteria.push(newCriterion)
      }
    }

    // Actualizar el estado
    setSortCriteria(newSortCriteria)

    // Aplicar el ordenamiento a los datos
    let sortedData: any[] = []

    if (searchType === "state") {
      sortedData = [...stateCitiesResults]
      applyMultiSort(sortedData, newSortCriteria)
      setStateCitiesResults(sortedData)
    } else if (searchType === "topCities") {
      sortedData = [...topCitiesResults]
      applyMultiSort(sortedData, newSortCriteria)
      setTopCitiesResults(sortedData)
    } else if (searchType === "advancedFilter") {
      sortedData = [...filteredCities]
      applyMultiSort(sortedData, newSortCriteria)
      setFilteredCities(sortedData)
    }
  }

  // Añadamos la función auxiliar para aplicar múltiples criterios de ordenamiento:
  const applyMultiSort = (data: any[], criteria: Array<{ column: string; direction: "asc" | "desc" }>) => {
    data.sort((a, b) => {
      // Iterar a través de los criterios en orden
      for (const criterion of criteria) {
        let comparison = 0

        // Aplicar la comparación según la columna
        if (criterion.column === "name") {
          comparison = a.name.localeCompare(b.name)
        } else if (criterion.column === "state" && a.stateName && b.stateName) {
          comparison = a.stateName.localeCompare(b.stateName)
        } else if (criterion.column === "population") {
          comparison = a.mexicanPopulation - b.mexicanPopulation
        } else if (criterion.column === "percentage") {
          comparison = a.percentage - b.percentage
        } else if (criterion.column === "income") {
          comparison = a.medianIncome - b.medianIncome
        }

        // Invertir la comparación si la dirección es descendente
        if (criterion.direction === "desc") {
          comparison = -comparison
        }

        // Si hay una diferencia, devolver el resultado
        if (comparison !== 0) {
          return comparison
        }

        // Si no hay diferencia, continuar con el siguiente criterio
      }

      // Si todos los criterios son iguales, mantener el orden original
      return 0
    })
  }

  const handleCitySelect = async (city: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const API_KEY = localStorage.getItem("census_api_key") || process.env.CENSUS_API_KEY

      if (!API_KEY) {
        throw new Error("Census API key is not available")
      }

      const data = await fetchLocationSpecificData(city.stateCode, city.placeId)
      setSelectedCityData(data)
    } catch (error) {
      console.error("Error obteniendo detalles de la ciudad:", error)
      setError(error instanceof Error ? error.message : "Error desconocido al obtener detalles de la ciudad")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    setSearchResults(null)

    try {
      switch (searchType) {
        case "zipcode":
          if (!validateZipCode(zipCode)) {
            throw new Error("Por favor, ingresa un código postal válido (5 dígitos)")
          }
          const zipCodeData = await fetchLocationSpecificData(zipCode.substring(0, 2), zipCode)
          setSearchResults(zipCodeData)
          break
        case "location":
          if (!validateStateCode(stateCode)) {
            throw new Error("Por favor, ingresa un código de estado válido (2 dígitos)")
          }
          if (!validatePlaceId(placeId)) {
            throw new Error("Por favor, ingresa un ID de lugar válido (números)")
          }
          const locationData = await fetchLocationSpecificData(stateCode, placeId)
          setSearchResults(locationData)
          break
        case "city":
          const cityData = await searchByCity(cityName)
          setSearchResults(cityData)
          break
        case "state":
          if (!selectedState) {
            throw new Error("Por favor, selecciona un estado")
          }
          const cities = await searchCitiesByState(selectedState)
          setStateCitiesResults(cities)
          break
        case "neighborhood":
          // Implementar búsqueda por barrio si es necesario
          break
        case "topCities":
          await fetchTopCitiesByState()
          break
        case "compareStates":
          await fetchStateComparisonData()
          break
        case "advancedFilter":
          // La lógica para el filtro avanzado se maneja en la función applyAdvancedFilters
          break
        default:
          throw new Error("Tipo de búsqueda no válido")
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error)
      setError(error instanceof Error ? error.message : "Error desconocido en la búsqueda")
    } finally {
      setIsLoading(false)
    }
  }

  const applyAdvancedFilters = async () => {
    if (!advancedFilterState) {
      setError("Por favor, selecciona un estado para aplicar los filtros avanzados")
      return
    }

    setIsLoading(true)
    setError(null)
    setFilteredCities([])

    try {
      // Obtener todas las ciudades del estado seleccionado
      const allCities = await searchCitiesByState(advancedFilterState)

      // Aplicar filtros
      const filtered = allCities.filter(
        (city) =>
          city.mexicanPopulation >= filterCriteria.minPopulation &&
          city.mexicanPopulation <= filterCriteria.maxPopulation &&
          city.percentage >= filterCriteria.minPercentage &&
          city.percentage <= filterCriteria.maxPercentage &&
          city.medianIncome >= filterCriteria.minIncome &&
          city.medianIncome <= filterCriteria.maxIncome,
      )

      // Ordenar resultados
      const sorted = [...filtered]
      if (filterCriteria.sortBy === "population") {
        sorted.sort((a, b) =>
          filterCriteria.sortOrder === "desc"
            ? b.mexicanPopulation - a.mexicanPopulation
            : a.mexicanPopulation - b.mexicanPopulation,
        )
      } else if (filterCriteria.sortBy === "percentage") {
        sorted.sort((a, b) =>
          filterCriteria.sortOrder === "desc" ? b.percentage - a.percentage : a.percentage - b.percentage,
        )
      } else if (filterCriteria.sortBy === "income") {
        sorted.sort((a, b) =>
          filterCriteria.sortOrder === "desc" ? b.medianIncome - a.medianIncome : a.medianIncome - b.medianIncome,
        )
      }

      // Aplicar el límite de ciudades
      const limitedResults = sorted.slice(0, cityLimit)

      setFilteredCities(limitedResults)
    } catch (error) {
      console.error("Error al aplicar filtros avanzados:", error)
      setError(error instanceof Error ? error.message : "Error desconocido al aplicar filtros")
    } finally {
      setIsLoading(false)
    }
  }

  // Añadir después de la función applyAdvancedFilters

  // Cargar configuraciones guardadas al iniciar
  useEffect(() => {
    const savedConfigs = localStorage.getItem("sortConfigurations")
    if (savedConfigs) {
      try {
        setSavedSortConfigs(JSON.parse(savedConfigs))
      } catch (e) {
        console.error("Error al cargar configuraciones guardadas:", e)
      }
    }
  }, [])

  // Guardar configuración actual
  const saveCurrentSortConfig = () => {
    if (!newConfigName.trim()) {
      setError("Por favor, ingresa un nombre para la configuración")
      return
    }

    // Crear un ID único basado en timestamp
    const configId = `config_${Date.now()}`

    // Crear la nueva configuración
    const newConfig = {
      id: configId,
      name: newConfigName.trim(),
      criteria: sortCriteria,
      searchType: searchType,
    }

    // Actualizar el estado con la nueva configuración
    const updatedConfigs = [...savedSortConfigs, newConfig]
    setSavedSortConfigs(updatedConfigs)

    // Guardar en localStorage
    localStorage.setItem("sortConfigurations", JSON.stringify(updatedConfigs))

    // Limpiar y cerrar el diálogo
    setNewConfigName("")
    setSaveConfigDialogOpen(false)
  }

  // Cargar una configuración guardada
  const loadSortConfig = (configId: string) => {
    const config = savedSortConfigs.find((c) => c.id === configId)
    if (config) {
      // Aplicar los criterios de ordenamiento
      setSortCriteria(config.criteria)

      // Si el tipo de búsqueda es diferente, mostrar una advertencia
      if (config.searchType !== searchType) {
        setError(
          `Nota: Esta configuración fue creada para la búsqueda de tipo "${config.searchType}". Algunos criterios podrían no aplicarse correctamente.`,
        )
      }

      // Aplicar el ordenamiento a los datos actuales
      let dataToSort: any[] = []

      if (searchType === "state") {
        dataToSort = [...stateCitiesResults]
        applyMultiSort(dataToSort, config.criteria)
        setStateCitiesResults(dataToSort)
      } else if (searchType === "topCities") {
        dataToSort = [...topCitiesResults]
        applyMultiSort(dataToSort, config.criteria)
        setTopCitiesResults(dataToSort)
      } else if (searchType === "advancedFilter") {
        dataToSort = [...filteredCities]
        applyMultiSort(dataToSort, config.criteria)
        setFilteredCities(dataToSort)
      }
    }

    // Cerrar el diálogo
    setLoadConfigDialogOpen(false)
  }

  // Eliminar una configuración guardada
  const deleteSortConfig = (configId: string, e: React.MouseEvent) => {
    // Evitar que el clic se propague al elemento padre
    e.stopPropagation()

    // Filtrar la configuración a eliminar
    const updatedConfigs = savedSortConfigs.filter((c) => c.id !== configId)
    setSavedSortConfigs(updatedConfigs)

    // Actualizar localStorage
    localStorage.setItem("sortConfigurations", JSON.stringify(updatedConfigs))
  }

  // Declare the missing functions
  const renderCityDetails = (data: any) => {
    if (!data) return null

    return (
      <div>
        <p>Nombre: {data.name}</p>
        <p>Población Total: {data.totalPopulation}</p>
        <p>Población Mexicana: {data.mexicanPopulation}</p>
        <p>Porcentaje: {data.percentage}</p>
        <p>Ingreso Medio: {data.medianIncome}</p>
      </div>
    )
  }

  const renderStateCitiesTable = () => {
    return (
      <div>
        {stateCitiesResults.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead>Población Mexicana</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Ingreso Medio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateCitiesResults.map((city) => (
                <TableRow key={city.placeId}>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>{city.mexicanPopulation}</TableCell>
                  <TableCell>{city.percentage}</TableCell>
                  <TableCell>{city.medianIncome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>No se encontraron ciudades.</p>
        )}
      </div>
    )
  }

  const renderTopCitiesTable = () => {
    return (
      <div>
        {topCitiesResults.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ciudad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Población Mexicana</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Ingreso Medio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCitiesResults.map((city) => (
                <TableRow key={`${city.stateCode}-${city.placeId}`}>
                  <TableCell>{city.name}</TableCell>
                  <TableCell>{city.stateName}</TableCell>
                  <TableCell>{city.mexicanPopulation}</TableCell>
                  <TableCell>{city.percentage}</TableCell>
                  <TableCell>{city.medianIncome}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>No se encontraron ciudades.</p>
        )}
      </div>
    )
  }

  const renderStateComparisonTable = () => {
    return (
      <div>
        {stateComparisonData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estado</TableHead>
                <TableHead>Población Mexicana</TableHead>
                <TableHead>Porcentaje</TableHead>
                <TableHead>Ingreso Medio</TableHead>
                <TableHead>Número de Ciudades</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stateComparisonData.map((state) => (
                <TableRow key={state.stateCode}>
                  <TableCell>{state.stateName}</TableCell>
                  <TableCell>{state.mexicanPopulation}</TableCell>
                  <TableCell>{state.percentage}</TableCell>
                  <TableCell>{state.medianIncome}</TableCell>
                  <TableCell>{state.citiesCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p>No se encontraron datos de comparación.</p>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Búsqueda Específica</CardTitle>
        <CardDescription>
          Encuentra datos demográficos específicos por código postal, ubicación, ciudad o estado.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs defaultValue="zipcode" className="w-full">
          <TabsList>
            <TabsTrigger value="zipcode" onClick={() => setSearchType("zipcode")}>
              Código Postal
            </TabsTrigger>
            <TabsTrigger value="location" onClick={() => setSearchType("location")}>
              Ubicación
            </TabsTrigger>
            <TabsTrigger value="city" onClick={() => setSearchType("city")}>
              Ciudad
            </TabsTrigger>
            <TabsTrigger value="state" onClick={() => setSearchType("state")}>
              Estado
            </TabsTrigger>
            <TabsTrigger value="topCities" onClick={() => setSearchType("topCities")}>
              Top Ciudades
            </TabsTrigger>
            <TabsTrigger value="compareStates" onClick={() => setSearchType("compareStates")}>
              Comparar Estados
            </TabsTrigger>
            <TabsTrigger value="advancedFilter" onClick={() => setSearchType("advancedFilter")}>
              Filtro Avanzado
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {error && <div className="text-red-500">{error}</div>}

        {searchType === "zipcode" ? (
          <div className="grid gap-2">
            <Label htmlFor="zipcode">Código Postal</Label>
            <Input
              type="text"
              id="zipcode"
              placeholder="Ej. 06000"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
            />
          </div>
        ) : searchType === "location" ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state-code">Código de Estado</Label>
              <Input
                type="text"
                id="state-code"
                placeholder="Ej. 06"
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="place-id">ID de Lugar</Label>
              <Input
                type="text"
                id="place-id"
                placeholder="Ej. 44000"
                value={placeId}
                onChange={(e) => setPlaceId(e.target.value)}
              />
            </div>
          </div>
        ) : searchType === "city" ? (
          <div className="grid gap-2">
            <Label htmlFor="city-name">Nombre de la Ciudad</Label>
            <Input
              type="text"
              id="city-name"
              placeholder="Ej. Los Angeles"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
            />
          </div>
        ) : searchType === "state" ? (
          <div className="space-y-2">
            <Label htmlFor="state-select">Selecciona un Estado</Label>
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
          </div>
        ) : searchType === "topCities" ? (
          <div className="space-y-2">
            <Label htmlFor="top-cities-count">Número de Ciudades a Mostrar</Label>
            <Input
              type="number"
              id="top-cities-count"
              min="5"
              max="50"
              value={topCitiesCount}
              onChange={(e) => setTopCitiesCount(Number.parseInt(e.target.value))}
            />
          </div>
        ) : searchType === "compareStates" ? (
          <div className="space-y-2">
            <Label>Selecciona los Estados a Comparar</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SUGGESTED_STATES.map((state) => (
                <Button
                  key={state.code}
                  variant={selectedStates.includes(state.code) ? "default" : "outline"}
                  onClick={() => toggleStateSelection(state.code)}
                >
                  {state.name}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {US_STATES.map((state) => (
                <div key={state.code} className="flex items-center space-x-2">
                  <Checkbox
                    id={`state-${state.code}`}
                    checked={selectedStates.includes(state.code)}
                    onCheckedChange={() => toggleStateSelection(state.code)}
                  />
                  <Label htmlFor={`state-${state.code}`}>{state.name}</Label>
                </div>
              ))}
            </div>
          </div>
        ) : searchType === "advancedFilter" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="advanced-filter-state" className="text-sm font-medium">
                Selecciona un Estado para Filtrar sus Ciudades
              </label>
              <Select value={advancedFilterState} onValueChange={setAdvancedFilterState}>
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
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="city-limit" className="text-sm font-medium">
                  Número de ciudades a mostrar
                </label>
                <span className="text-sm font-medium">{cityLimit}</span>
              </div>
              <input
                id="city-limit"
                type="range"
                min="10"
                max="500"
                step="10"
                value={cityLimit}
                onChange={(e) => setCityLimit(Number.parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Selecciona cuántas ciudades quieres mostrar en los resultados (de 10 a 500)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <h4 className="font-medium">Población Mexicana</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="min-population" className="text-xs">
                      Mínimo
                    </label>
                    <Input
                      id="min-population"
                      type="number"
                      min="0"
                      value={filterCriteria.minPopulation}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          minPopulation: Number.parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="max-population" className="text-xs">
                      Máximo
                    </label>
                    <Input
                      id="max-population"
                      type="number"
                      min="0"
                      value={filterCriteria.maxPopulation}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          maxPopulation: Number.parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Porcentaje del Total</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="min-percentage" className="text-xs">
                      Mínimo (%)
                    </label>
                    <Input
                      id="min-percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={filterCriteria.minPercentage}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          minPercentage: Number.parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="max-percentage" className="text-xs">
                      Máximo (%)
                    </label>
                    <Input
                      id="max-percentage"
                      type="number"
                      min="0"
                      max="100"
                      value={filterCriteria.maxPercentage}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          maxPercentage: Number.parseFloat(e.target.value) || 100,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Ingreso Medio</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="min-income" className="text-xs">
                      Mínimo ($)
                    </label>
                    <Input
                      id="min-income"
                      type="number"
                      min="0"
                      value={filterCriteria.minIncome}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          minIncome: Number.parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="max-income" className="text-xs">
                      Máximo ($)
                    </label>
                    <Input
                      id="max-income"
                      type="number"
                      min="0"
                      value={filterCriteria.maxIncome}
                      onChange={(e) =>
                        setFilterCriteria({
                          ...filterCriteria,
                          maxIncome: Number.parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Ordenar Por</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={filterCriteria.sortBy}
                    onValueChange={(value: "population" | "percentage" | "income") =>
                      setFilterCriteria({ ...filterCriteria, sortBy: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Criterio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="population">Población Mexicana</SelectItem>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="income">Ingreso Medio</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filterCriteria.sortOrder}
                    onValueChange={(value: "asc" | "desc") =>
                      setFilterCriteria({ ...filterCriteria, sortOrder: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Orden" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Mayor a Menor</SelectItem>
                      <SelectItem value="asc">Menor a Mayor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button onClick={applyAdvancedFilters} disabled={isLoading || !advancedFilterState} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aplicando filtros...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Aplicar Filtros
                </>
              )}
            </Button>

            {filteredCities.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-lg">Mostrando {filteredCities.length} ciudades</h3>
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
                        <DialogDescription>
                          Selecciona las columnas que deseas incluir en el archivo CSV.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="export-name"
                            checked={selectedColumns.name}
                            onCheckedChange={(checked) =>
                              setSelectedColumns({ ...selectedColumns, name: checked === true })
                            }
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
                // Añadir este elemento informativo antes de la tabla
                <div className="text-xs text-gray-500 mb-2">
                  Haz clic en un encabezado para ordenar. Mantén presionada la tecla Shift mientras haces clic para
                  ordenar por múltiples columnas.
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSaveConfigDialogOpen(true)}
                    disabled={sortCriteria.length === 0}
                    className="flex items-center gap-1"
                  >
                    Guardar ordenamiento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLoadConfigDialogOpen(true)}
                    disabled={savedSortConfigs.length === 0}
                    className="flex items-center gap-1"
                  >
                    Cargar ordenamiento
                  </Button>
                </div>
                {/* Diálogo para guardar configuración */}
                <Dialog open={saveConfigDialogOpen} onOpenChange={setSaveConfigDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Guardar configuración de ordenamiento</DialogTitle>
                      <DialogDescription>
                        Guarda la configuración actual de ordenamiento para usarla en el futuro.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="config-name" className="text-right">
                          Nombre
                        </Label>
                        <Input
                          id="config-name"
                          value={newConfigName}
                          onChange={(e) => setNewConfigName(e.target.value)}
                          placeholder="Mi ordenamiento personalizado"
                          className="col-span-3"
                        />
                      </div>
                      {sortCriteria.length > 0 ? (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <p className="text-sm font-medium mb-2">Criterios actuales:</p>
                          <ul className="text-sm space-y-1">
                            {sortCriteria.map((criterion, index) => (
                              <li key={index}>
                                {index + 1}.{" "}
                                {criterion.column === "name"
                                  ? "Ciudad"
                                  : criterion.column === "state"
                                    ? "Estado"
                                    : criterion.column === "population"
                                      ? "Población Mexicana"
                                      : criterion.column === "percentage"
                                        ? "% del Total"
                                        : criterion.column === "income"
                                          ? "Ingreso Medio"
                                          : criterion.column}{" "}
                                ({criterion.direction === "asc" ? "Ascendente" : "Descendente"})
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No hay criterios de ordenamiento definidos.</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => setSaveConfigDialogOpen(false)} variant="outline">
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={saveCurrentSortConfig}
                        disabled={!newConfigName.trim() || sortCriteria.length === 0}
                      >
                        Guardar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Diálogo para cargar configuración */}
                <Dialog open={loadConfigDialogOpen} onOpenChange={setLoadConfigDialogOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Cargar configuración de ordenamiento</DialogTitle>
                      <DialogDescription>
                        Selecciona una configuración guardada para aplicarla a los datos actuales.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {savedSortConfigs.length > 0 ? (
                        <div className="max-h-[300px] overflow-y-auto">
                          {savedSortConfigs.map((config) => (
                            <div
                              key={config.id}
                              className="flex justify-between items-center p-3 border rounded-md mb-2 hover:bg-gray-50 cursor-pointer"
                              onClick={() => loadSortConfig(config.id)}
                            >
                              <div>
                                <p className="font-medium">{config.name}</p>
                                <p className="text-xs text-gray-500">
                                  {config.criteria.length} criterio(s) • Creado para: {config.searchType}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => deleteSortConfig(config.id, e)}
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Eliminar</span>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-trash-2"
                                >
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                  <line x1="10" x2="10" y1="11" y2="17"></line>
                                  <line x1="14" x2="14" y1="11" y2="17"></line>
                                </svg>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-gray-500">No hay configuraciones guardadas.</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={() => setLoadConfigDialogOpen(false)} variant="outline">
                        Cancelar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          onClick={(e) => handleSort("name", e.shiftKey)}
                          className="cursor-pointer hover:bg-gray-100"
                        >
                          Ciudad
                          {sortCriteria.findIndex((c) => c.column === "name") >= 0 && (
                            <span className="ml-1">
                              {sortCriteria[sortCriteria.findIndex((c) => c.column === "name")].direction === "asc"
                                ? "↑"
                                : "↓"}
                              {sortCriteria.length > 1 && (
                                <sup className="text-xs font-bold">
                                  {sortCriteria.findIndex((c) => c.column === "name") + 1}
                                </sup>
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          onClick={(e) => handleSort("population", e.shiftKey)}
                          className="text-right cursor-pointer hover:bg-gray-100"
                        >
                          Población Mexicana
                          {sortCriteria.findIndex((c) => c.column === "population") >= 0 && (
                            <span className="ml-1">
                              {sortCriteria[sortCriteria.findIndex((c) => c.column === "population")].direction ===
                              "asc"
                                ? "↑"
                                : "↓"}
                              {sortCriteria.length > 1 && (
                                <sup className="text-xs font-bold">
                                  {sortCriteria.findIndex((c) => c.column === "population") + 1}
                                </sup>
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          onClick={(e) => handleSort("percentage", e.shiftKey)}
                          className="text-right cursor-pointer hover:bg-gray-100"
                        >
                          % del Total
                          {sortCriteria.findIndex((c) => c.column === "percentage") >= 0 && (
                            <span className="ml-1">
                              {sortCriteria[sortCriteria.findIndex((c) => c.column === "percentage")].direction ===
                              "asc"
                                ? "↑"
                                : "↓"}
                              {sortCriteria.length > 1 && (
                                <sup className="text-xs font-bold">
                                  {sortCriteria.findIndex((c) => c.column === "percentage") + 1}
                                </sup>
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead
                          onClick={(e) => handleSort("income", e.shiftKey)}
                          className="text-right cursor-pointer hover:bg-gray-100"
                        >
                          Ingreso Medio
                          {sortCriteria.findIndex((c) => c.column === "income") >= 0 && (
                            <span className="ml-1">
                              {sortCriteria[sortCriteria.findIndex((c) => c.column === "income")].direction === "asc"
                                ? "↑"
                                : "↓"}
                              {sortCriteria.length > 1 && (
                                <sup className="text-xs font-bold">
                                  {sortCriteria.findIndex((c) => c.column === "income") + 1}
                                </sup>
                              )}
                            </span>
                          )}
                        </TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCities.map((city) => (
                        <TableRow key={`${city.stateCode}-${city.placeId}`}>
                          <TableCell className="font-medium">{city.name}</TableCell>
                          <TableCell className="text-right">{city.mexicanPopulation.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{city.percentage}%</TableCell>
                          <TableCell className="text-right">${city.medianIncome.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCitySelect(city)}
                              disabled={isLoading}
                            >
                              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ver detalles"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : searchType === "state" ? (
          // Resto del código...
          <></>
        ) : (
          <></>
        )}

        <Button onClick={handleSearch} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Buscar
        </Button>

        {searchResults && (
          <div className="mt-6">
            <h3 className="font-medium text-lg mb-2">Resultados de la Búsqueda</h3>
            {renderCityDetails(searchResults)}
          </div>
        )}

        {searchType === "state" && renderStateCitiesTable()}
        {searchType === "topCities" && renderTopCitiesTable()}
        {searchType === "compareStates" && renderStateComparisonTable()}
      </CardContent>
    </Card>
  )
}
