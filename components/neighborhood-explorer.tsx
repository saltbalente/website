"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, MapPin } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { fetchNeighborhoodsByCity } from "@/lib/census-api"

// Lista de ciudades con alta población mexicana
const MEXICAN_CITIES = [
  { name: "Los Angeles", state: "California", stateCode: "06", placeId: "44000" },
  { name: "Houston", state: "Texas", stateCode: "48", placeId: "35000" },
  { name: "Chicago", state: "Illinois", stateCode: "17", placeId: "14000" },
  { name: "San Antonio", state: "Texas", stateCode: "48", placeId: "65000" },
  { name: "Phoenix", state: "Arizona", stateCode: "04", placeId: "55000" },
  { name: "Dallas", state: "Texas", stateCode: "48", placeId: "19000" },
  { name: "San Diego", state: "California", stateCode: "06", placeId: "66000" },
  { name: "San Jose", state: "California", stateCode: "06", placeId: "68000" },
  { name: "El Paso", state: "Texas", stateCode: "48", placeId: "24000" },
  { name: "Fresno", state: "California", stateCode: "06", placeId: "27000" },
  { name: "Denver", state: "Colorado", stateCode: "08", placeId: "20000" },
  { name: "New York", state: "New York", stateCode: "36", placeId: "51000" },
  { name: "Sacramento", state: "California", stateCode: "06", placeId: "64000" },
  { name: "Las Vegas", state: "Nevada", stateCode: "32", placeId: "40000" },
  { name: "San Francisco", state: "California", stateCode: "06", placeId: "67000" },
]

export function NeighborhoodExplorer() {
  const [selectedCity, setSelectedCity] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [neighborhoods, setNeighborhoods] = useState<any[]>([])
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Obtener los barrios cuando se selecciona una ciudad
  useEffect(() => {
    if (!selectedCity) return

    const fetchNeighborhoods = async () => {
      setIsLoading(true)
      setError(null)
      setNeighborhoods([])
      setSelectedNeighborhood(null)

      try {
        const [stateCode, placeId] = selectedCity.split("-")
        const data = await fetchNeighborhoodsByCity(stateCode, placeId)
        setNeighborhoods(data)
      } catch (error) {
        console.error("Error fetching neighborhoods:", error)
        setError(error instanceof Error ? error.message : "Error desconocido al obtener los barrios")
      } finally {
        setIsLoading(false)
      }
    }

    fetchNeighborhoods()
  }, [selectedCity])

  const handleNeighborhoodSelect = (neighborhood: any) => {
    setSelectedNeighborhood(neighborhood)
  }

  // Función para renderizar la tabla de barrios
  const renderNeighborhoodsTable = () => {
    if (neighborhoods.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {isLoading ? (
            <div className="flex justify-center items-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
              <span className="ml-2">Cargando barrios...</span>
            </div>
          ) : (
            "Selecciona una ciudad para ver sus barrios con población mexicana"
          )}
        </div>
      )
    }

    const cityInfo = MEXICAN_CITIES.find((city) => {
      const cityValue = `${city.stateCode}-${city.placeId}`
      return cityValue === selectedCity
    })

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">
            Barrios con población mexicana en {cityInfo?.name || "la ciudad seleccionada"}
          </h3>
          <Badge variant="outline" className="text-xs">
            {neighborhoods.length} barrios encontrados
          </Badge>
        </div>

        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barrio</TableHead>
                <TableHead className="text-right">Población Mexicana</TableHead>
                <TableHead className="text-right">% del Total</TableHead>
                <TableHead className="text-right">Código Postal</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {neighborhoods.map((neighborhood) => (
                <TableRow
                  key={`${neighborhood.stateCode}-${neighborhood.countyId}-${neighborhood.tractId}`}
                  className={
                    selectedNeighborhood &&
                    selectedNeighborhood.tractId === neighborhood.tractId &&
                    selectedNeighborhood.countyId === neighborhood.countyId
                      ? "bg-gray-100"
                      : "hover:bg-gray-50"
                  }
                >
                  <TableCell className="font-medium">{neighborhood.name}</TableCell>
                  <TableCell className="text-right">{neighborhood.mexicanPopulation.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{neighborhood.percentage}%</TableCell>
                  <TableCell className="text-right">
                    {neighborhood.zipCode.includes(", ") ? (
                      <div className="flex flex-col items-end">
                        {neighborhood.zipCode.split(", ").map((zip: string, i: number) => (
                          <span key={i} className="text-xs">
                            {zip}
                          </span>
                        ))}
                      </div>
                    ) : (
                      neighborhood.zipCode
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNeighborhoodSelect(neighborhood)}
                      className="flex items-center gap-1"
                    >
                      <MapPin className="h-3 w-3" />
                      Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  // Función para renderizar los detalles de un barrio seleccionado
  const renderNeighborhoodDetails = () => {
    if (!selectedNeighborhood) return null

    // Preparar datos para el gráfico de comparación
    const comparisonData = [
      {
        name: "Este Barrio",
        mexicanPercentage: selectedNeighborhood.percentage,
        totalPopulation: selectedNeighborhood.totalPopulation,
      },
      {
        name: "Promedio Ciudad",
        mexicanPercentage: Math.round(neighborhoods.reduce((sum, n) => sum + n.percentage, 0) / neighborhoods.length),
        totalPopulation: Math.round(
          neighborhoods.reduce((sum, n) => sum + n.totalPopulation, 0) / neighborhoods.length,
        ),
      },
    ]

    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-medium">Detalles del Barrio: {selectedNeighborhood.name}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Información Demográfica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Población Total:</div>
                  <div>{selectedNeighborhood.totalPopulation.toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Población Mexicana:</div>
                  <div>{selectedNeighborhood.mexicanPopulation.toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Porcentaje Mexicano:</div>
                  <div>{selectedNeighborhood.percentage}%</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Ingreso Medio:</div>
                  <div>${selectedNeighborhood.medianIncome.toLocaleString()}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">Código Postal:</div>
                  <div>
                    {selectedNeighborhood.zipCode.includes(", ") ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedNeighborhood.zipCode.split(", ").map((zip: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {zip}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      selectedNeighborhood.zipCode
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">ID de Tract:</div>
                  <div>{selectedNeighborhood.tractId}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-medium">ID de Condado:</div>
                  <div>{selectedNeighborhood.countyId}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Comparación con el Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ChartContainer
                  config={{
                    mexicanPercentage: {
                      label: "% Población Mexicana",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <XAxis dataKey="name" fontSize={12} />
                      <YAxis width={40} fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="mexicanPercentage"
                        name="% Población Mexicana"
                        fill="var(--color-mexicanPercentage)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>

              <div className="mt-4 text-sm text-gray-600">
                <p>
                  Este barrio tiene un{" "}
                  {selectedNeighborhood.percentage >
                  Math.round(neighborhoods.reduce((sum, n) => sum + n.percentage, 0) / neighborhoods.length)
                    ? "mayor"
                    : "menor"}{" "}
                  porcentaje de población mexicana que el promedio de la ciudad.
                </p>
                <p className="mt-2">
                  El ingreso medio de ${selectedNeighborhood.medianIncome.toLocaleString()} es{" "}
                  {selectedNeighborhood.medianIncome >
                  Math.round(neighborhoods.reduce((sum, n) => sum + n.medianIncome, 0) / neighborhoods.length)
                    ? "superior"
                    : "inferior"}{" "}
                  al promedio de los barrios con población mexicana en esta ciudad.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recomendaciones para Google Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-medium">Segmentación geográfica:</span> Utiliza el código postal{" "}
                {selectedNeighborhood.zipCode} para campañas específicas dirigidas a la población mexicana en este
                barrio.
              </p>
              <p>
                <span className="font-medium">Segmentación demográfica:</span> Considera que este barrio tiene una
                concentración del {selectedNeighborhood.percentage}% de población mexicana, lo que representa{" "}
                {selectedNeighborhood.mexicanPopulation.toLocaleString()} personas.
              </p>
              <p>
                <span className="font-medium">Segmentación por ingresos:</span> El ingreso medio de $
                {selectedNeighborhood.medianIncome.toLocaleString()} sugiere un poder adquisitivo{" "}
                {selectedNeighborhood.medianIncome > 60000
                  ? "medio-alto"
                  : selectedNeighborhood.medianIncome > 40000
                    ? "medio"
                    : "medio-bajo"}{" "}
                para este segmento.
              </p>
              <p>
                <span className="font-medium">Idioma y mensajes:</span> Considera incluir mensajes bilingües
                (español/inglés) y referencias culturales relevantes para la comunidad mexicana en tus anuncios.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Explorador de Barrios</CardTitle>
        <CardDescription>
          Identifica los barrios con mayor población mexicana dentro de las principales ciudades
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="city-select" className="text-sm font-medium">
            Selecciona una Ciudad
          </label>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una ciudad" />
            </SelectTrigger>
            <SelectContent>
              {MEXICAN_CITIES.map((city) => (
                <SelectItem key={`${city.stateCode}-${city.placeId}`} value={`${city.stateCode}-${city.placeId}`}>
                  {city.name}, {city.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            Estas ciudades tienen una significativa población de origen mexicano según el U.S. Census Bureau
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {renderNeighborhoodsTable()}
        {selectedNeighborhood && renderNeighborhoodDetails()}
      </CardContent>
      <CardFooter className="flex flex-col items-start text-xs text-gray-500">
        <p className="mb-1">
          <strong>Nota sobre los datos:</strong> La información de barrios se basa en los Census Tracts del U.S. Census
          Bureau, que son unidades geográficas diseñadas para contener aproximadamente 4,000 habitantes.
        </p>
        <p>
          Los códigos postales mostrados pueden abarcar múltiples barrios, ya que no siempre hay una correspondencia
          exacta entre barrios y códigos postales.
        </p>
      </CardFooter>
    </Card>
  )
}
