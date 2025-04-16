"use client"

import { useState } from "react"
import { Search, Loader2, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { fetchDataByZipCode, fetchLocationSpecificData } from "@/lib/census-api"
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

export function SpecificSearch() {
  const [searchType, setSearchType] = useState<"zipcode" | "location" | "city" | "state" | "neighborhood">("zipcode")
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

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    setSearchResults(null)
    setStateCitiesResults([])
    setSelectedCityData(null)

    try {
      if (searchType === "zipcode") {
        if (!zipCode) {
          throw new Error("Por favor, ingresa un código postal")
        }

        if (!validateZipCode(zipCode)) {
          throw new Error("El código postal debe tener 5 dígitos numéricos (formato XXXXX)")
        }

        const results = await fetchDataByZipCode(zipCode)
        setSearchResults(results)
      } else if (searchType === "city") {
        if (!cityName) {
          throw new Error("Por favor, ingresa un nombre de ciudad")
        }

        const results = await searchByCity(cityName)
        setSearchResults(results)
      } else if (searchType === "state") {
        if (!selectedState) {
          throw new Error("Por favor, selecciona un estado")
        }

        const cities = await searchCitiesByState(selectedState)
        setStateCitiesResults(cities)
      } else if (searchType === "neighborhood") {
        // La búsqueda de barrios se maneja en el componente NeighborhoodExplorer
        return
      } else {
        if (!stateCode) {
          throw new Error("Por favor, ingresa un código de estado")
        }

        if (!validateStateCode(stateCode)) {
          throw new Error("El código de estado debe tener 2 dígitos numéricos (formato XX)")
        }

        if (!placeId) {
          throw new Error("Por favor, ingresa un ID de lugar")
        }

        if (!validatePlaceId(placeId)) {
          throw new Error("El ID de lugar debe contener solo dígitos numéricos")
        }

        const results = await fetchLocationSpecificData(stateCode, placeId)
        setSearchResults(results)
      }
    } catch (error) {
      console.error("Error en la búsqueda:", error)
      setError(error instanceof Error ? error.message : "Error desconocido en la búsqueda")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCitySelect = async (city: any) => {
    setIsLoading(true)
    setError(null)
    setSelectedCityData(null)

    try {
      const cityData = await fetchLocationSpecificData(city.stateCode, city.placeId)
      setSelectedCityData(cityData)
    } catch (error) {
      console.error("Error al obtener datos detallados de la ciudad:", error)
      setError(
        `No se pudieron obtener datos detallados para ${city.name}. Error: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Función para renderizar los resultados de manera organizada
  const renderResults = () => {
    if (!searchResults) return null

    // Filtrar los datos originales si están presentes
    const displayData = { ...searchResults }
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
      <div className="mt-4">
        <h3 className="font-medium text-lg mb-2">Resultados de la búsqueda</h3>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="demographic">Demografía</TabsTrigger>
            <TabsTrigger value="economic">Económico</TabsTrigger>
            <TabsTrigger value="education">Educación</TabsTrigger>
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
        </Tabs>

        {rawData && (
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRawData(!showRawData)}
              className="text-xs flex items-center gap-1"
            >
              <Info className="h-3 w-3" />
              {showRawData ? "Ocultar datos originales" : "Mostrar datos originales"}
            </Button>

            {showRawData && (
              <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs font-mono overflow-x-auto">
                <pre>{JSON.stringify(rawData, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Función para renderizar la tabla de ciudades por estado
  const renderStateCitiesTable = () => {
    if (stateCitiesResults.length === 0) return null

    const stateName = US_STATES.find((state) => state.code === selectedState)?.name || "Seleccionado"

    return (
      <div className="mt-4">
        <h3 className="font-medium text-lg mb-2">
          Ciudades con población mexicana en {stateName} ({stateCitiesResults.length})
        </h3>

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
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="demographic">Demografía</TabsTrigger>
          <TabsTrigger value="economic">Económico</TabsTrigger>
          <TabsTrigger value="education">Educación</TabsTrigger>
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
      </Tabs>
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
          <Button variant={searchType === "location" ? "default" : "outline"} onClick={() => setSearchType("location")}>
            Ubicación Específica
          </Button>
        </div>

        {searchType === "neighborhood" ? (
          <NeighborhoodExplorer />
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
