"use client"

import { useState } from "react"
import { Search, Loader2, AlertCircle, Info } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { fetchDataByZipCode, fetchLocationSpecificData } from "@/lib/census-api"

export function SpecificSearch() {
  const [searchType, setSearchType] = useState<"zipcode" | "location">("zipcode")
  const [zipCode, setZipCode] = useState("")
  const [stateCode, setStateCode] = useState("")
  const [placeId, setPlaceId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any>(null)
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

  const handleSearch = async () => {
    setIsLoading(true)
    setError(null)
    setSearchResults(null)

    try {
      let results

      if (searchType === "zipcode") {
        if (!zipCode) {
          throw new Error("Por favor, ingresa un código postal")
        }

        if (!validateZipCode(zipCode)) {
          throw new Error("El código postal debe tener 5 dígitos numéricos (formato XXXXX)")
        }

        results = await fetchDataByZipCode(zipCode)
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

        results = await fetchLocationSpecificData(stateCode, placeId)
      }

      setSearchResults(results)
    } catch (error) {
      console.error("Error en la búsqueda:", error)
      setError(error instanceof Error ? error.message : "Error desconocido en la búsqueda")
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Búsqueda Específica</CardTitle>
        <CardDescription>Busca datos demográficos específicos por código postal o ubicación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <Button variant={searchType === "zipcode" ? "default" : "outline"} onClick={() => setSearchType("zipcode")}>
            Código Postal
          </Button>
          <Button variant={searchType === "location" ? "default" : "outline"} onClick={() => setSearchType("location")}>
            Ubicación Específica
          </Button>
        </div>

        {searchType === "zipcode" ? (
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
      </CardContent>
      <CardFooter className="flex flex-col items-start text-xs text-gray-500">
        <p className="mb-1">
          <strong>Ejemplos de códigos postales válidos:</strong> 90022 (East Los Angeles, CA), 78501 (McAllen, TX),
          10001 (New York, NY)
        </p>
        <p>
          <strong>Ejemplos de códigos de estado:</strong> 06 (California), 48 (Texas), 36 (New York), 12 (Florida)
        </p>
      </CardFooter>
    </Card>
  )
}
