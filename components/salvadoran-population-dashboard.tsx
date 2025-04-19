"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PopulationTable } from "@/components/salvadoran-population-table"
import { PopulationMap } from "@/components/salvadoran-population-map"
import { PopulationChart } from "@/components/salvadoran-population-chart"
import { DemographicFilters } from "@/components/demographic-filters"
import { DemographicDetails } from "@/components/salvadoran-demographic-details"
import { SalvadoranSpecificSearch } from "@/components/salvadoran-specific-search"
import { fetchSalvadoranPopulationData, applyDemographicFilters } from "@/lib/salvadoran-census-api"
import type { LocationData } from "@/types/census"
import { ApiKeyConfig } from "@/components/api-key-config"
import { getSalvadoranBackupData } from "@/lib/salvadoran-backup-data"
import { SalvadoranComparisonCharts } from "@/components/salvadoran-comparison-charts"

export function SalvadoranPopulationDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [populationData, setPopulationData] = useState<LocationData[]>([])
  const [filteredData, setFilteredData] = useState<LocationData[]>([])
  const [activeView, setActiveView] = useState("table")
  const [demographicFilters, setDemographicFilters] = useState({
    ageRange: [] as string[],
    incomeRange: [] as string[],
    educationLevel: [] as string[],
  })
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null)
  const [showSpecificSearch, setShowSpecificSearch] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [apiKey, setApiKey] = useState<string | null>(null)

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        // Implementar un timeout para la carga de datos
        const timeoutPromise = new Promise<LocationData[]>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout loading data")), 15000)
        })

        // Cargar datos con un timeout
        const data = await Promise.race([fetchSalvadoranPopulationData(), timeoutPromise])

        setPopulationData(data)
        setFilteredData(data)
      } catch (error) {
        console.error("Error loading data:", error)
        // Mostrar un mensaje de error al usuario
        alert("Hubo un problema al cargar los datos del Census Bureau. Se mostrarán datos de respaldo.")

        // Intentar cargar datos de respaldo
        try {
          const backupData = await getSalvadoranBackupData()
          setPopulationData(backupData)
          setFilteredData(backupData)
        } catch (backupError) {
          console.error("Error loading backup data:", backupError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  useEffect(() => {
    // Aplicar filtros de búsqueda y demográficos
    let filtered = populationData

    // Filtrar por término de búsqueda
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (location) =>
          location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          location.state.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Aplicar filtros demográficos
    filtered = applyDemographicFilters(filtered, demographicFilters)

    setFilteredData(filtered)
  }, [searchTerm, populationData, demographicFilters])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Filter is already handled by the useEffect
  }

  const handleDemographicFilterChange = (filters: {
    ageRange: string[]
    incomeRange: string[]
    educationLevel: string[]
  }) => {
    setDemographicFilters(filters)
  }

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location)
  }

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis Demográfico Salvadoreño en EE.UU.</h1>
        <p className="text-gray-600">
          Datos demográficos de la población salvadoreña en Estados Unidos basados en el U.S. Census Bureau
        </p>
      </header>

      <div className="flex justify-end mb-4 gap-2">
        <Button variant="outline" onClick={() => setShowSpecificSearch(!showSpecificSearch)}>
          {showSpecificSearch ? "Ocultar búsqueda específica" : "Mostrar búsqueda específica"}
        </Button>
        <Button variant="outline" onClick={() => setShowApiConfig(!showApiConfig)}>
          {showApiConfig ? "Ocultar configuración API" : "Configurar API Key"}
        </Button>
      </div>

      {showSpecificSearch && (
        <div className="mb-8">
          <SalvadoranSpecificSearch />
        </div>
      )}

      {showApiConfig && (
        <div className="mb-8">
          <ApiKeyConfig onApiKeyChange={handleApiKeyChange} />
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filtrar Datos</CardTitle>
          <CardDescription>
            Busca por ubicación y aplica filtros demográficos para segmentar con precisión
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Buscar por ubicación..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button type="submit">Buscar</Button>
          </form>

          <div>
            <h3 className="text-sm font-medium mb-3">Filtros Demográficos</h3>
            <DemographicFilters onFilterChange={handleDemographicFilterChange} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Tabs defaultValue="table" className="mb-8" onValueChange={setActiveView}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="table">Tabla</TabsTrigger>
              <TabsTrigger value="map">Mapa</TabsTrigger>
              <TabsTrigger value="chart">Gráficos</TabsTrigger>
            </TabsList>

            <TabsContent value="table" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Población Salvadoreña por Ubicación</CardTitle>
                  <CardDescription>Datos demográficos detallados para campañas de Google Ads</CardDescription>
                </CardHeader>
                <CardContent>
                  <PopulationTable data={filteredData} isLoading={isLoading} onSelectLocation={handleLocationSelect} />
                </CardContent>
                <CardFooter className="text-sm text-gray-500">
                  Fuente: U.S. Census Bureau - Datos actualizados
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="map" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución Geográfica</CardTitle>
                  <CardDescription>Visualización de la población salvadoreña por región</CardDescription>
                </CardHeader>
                <CardContent>
                  <PopulationMap data={filteredData} isLoading={isLoading} onSelectLocation={handleLocationSelect} />
                </CardContent>
                <CardFooter className="text-sm text-gray-500">
                  Fuente: U.S. Census Bureau - Datos actualizados
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="chart" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Análisis Comparativo</CardTitle>
                  <CardDescription>Comparación de población salvadoreña entre diferentes ubicaciones</CardDescription>
                </CardHeader>
                <CardContent>
                  <PopulationChart data={filteredData} isLoading={isLoading} />
                </CardContent>
                <CardFooter className="text-sm text-gray-500">
                  Fuente: U.S. Census Bureau - Datos actualizados
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Detalles Demográficos</CardTitle>
              <CardDescription>
                {selectedLocation
                  ? `Información detallada de ${selectedLocation.name}, ${selectedLocation.state}`
                  : "Selecciona una ubicación para ver detalles"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedLocation ? (
                <DemographicDetails location={selectedLocation} />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Haz clic en una ubicación en la tabla o mapa para ver sus detalles demográficos
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Análisis Comparativo Avanzado</CardTitle>
            <CardDescription>Visualización detallada de datos demográficos salvadoreños</CardDescription>
          </CardHeader>
          <CardContent>
            <SalvadoranComparisonCharts data={filteredData} />
          </CardContent>
          <CardFooter className="text-sm text-gray-500">Fuente: U.S. Census Bureau - Datos actualizados</CardFooter>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Optimización para Google Ads</CardTitle>
          <CardDescription>Recomendaciones para segmentación demográfica en campañas publicitarias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">Segmentación por Edad</h3>
              <p className="text-gray-600">
                Personaliza tus anuncios según el grupo de edad predominante en cada ubicación para maximizar la
                relevancia.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Segmentación por Ingresos</h3>
              <p className="text-gray-600">
                Ajusta tus ofertas de productos y servicios según el nivel de ingresos de cada área geográfica.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Segmentación por Nivel Educativo</h3>
              <p className="text-gray-600">
                Adapta el lenguaje y complejidad de tus anuncios según el nivel educativo predominante en cada
                ubicación.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
