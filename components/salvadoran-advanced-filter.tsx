"use client"

import { useState, useEffect, useRef } from "react"
import { Filter, Save, FolderOpen, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import type { LocationData } from "@/types/census"

// Definir la interfaz para los filtros avanzados
export interface SalvadoranAdvancedFilterOptions {
  minPopulation: number
  maxPopulation: number
  minPercentage: number
  maxPercentage: number
  states: string[]
  includeAllStates: boolean
  minIncome: number
  maxIncome: number
  educationLevels: string[]
  includeAllEducation: boolean
  ageGroups: string[]
  includeAllAges: boolean
}

// Valores predeterminados para los filtros
export const defaultSalvadoranAdvancedFilterOptions: SalvadoranAdvancedFilterOptions = {
  minPopulation: 0,
  maxPopulation: 100000,
  minPercentage: 0,
  maxPercentage: 10,
  states: [],
  includeAllStates: true,
  minIncome: 0,
  maxIncome: 150000,
  educationLevels: [],
  includeAllEducation: true,
  ageGroups: [],
  includeAllAges: true,
}

// Mapeo de niveles educativos a etiquetas legibles
const educationLabels: Record<string, string> = {
  lessHighSchool: "Menos que secundaria",
  highSchool: "Secundaria",
  someCollege: "Algo de universidad",
  bachelors: "Licenciatura",
  graduate: "Posgrado",
}

// Mapeo de grupos de edad a etiquetas legibles
const ageGroupLabels: Record<string, string> = {
  under18: "Menores de 18",
  age18to24: "18 a 24 años",
  age25to34: "25 a 34 años",
  age35to44: "35 a 44 años",
  age45to54: "45 a 54 años",
  age55to64: "55 a 64 años",
  age65plus: "65 años o más",
}

// Interfaz para las configuraciones guardadas
interface SavedFilterConfig {
  name: string
  filters: SalvadoranAdvancedFilterOptions
  timestamp: number
}

interface SalvadoranAdvancedFilterProps {
  data: LocationData[]
  onFilterChange: (filteredData: LocationData[]) => void
  maxPopulation?: number
}

export function SalvadoranAdvancedFilter({
  data,
  onFilterChange,
  maxPopulation = 100000,
}: SalvadoranAdvancedFilterProps) {
  // Estado para los filtros actuales
  const [filters, setFilters] = useState<SalvadoranAdvancedFilterOptions>({
    ...defaultSalvadoranAdvancedFilterOptions,
    maxPopulation,
  })

  // Estado para el diálogo de filtros
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  // Estado para el diálogo de guardar filtros
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState("")

  // Estado para el diálogo de cargar filtros
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [savedFilters, setSavedFilters] = useState<SavedFilterConfig[]>([])

  // Estado para mostrar filtros activos
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  // Lista de estados únicos en los datos
  const [availableStates, setAvailableStates] = useState<string[]>([])

  // Añadir esta línea después de las declaraciones de estado
  const previousFilteredDataRef = useRef<LocationData[]>([])

  // Cargar filtros guardados al iniciar
  useEffect(() => {
    const loadSavedFilters = () => {
      try {
        const savedFiltersJson = localStorage.getItem("salvadoran_saved_filters")
        if (savedFiltersJson) {
          const parsedFilters = JSON.parse(savedFiltersJson) as SavedFilterConfig[]
          setSavedFilters(parsedFilters)
        }
      } catch (error) {
        console.error("Error loading saved filters:", error)
      }
    }

    loadSavedFilters()
  }, [])

  // Extraer estados únicos de los datos
  useEffect(() => {
    if (data && data.length > 0) {
      const states = [...new Set(data.map((item) => item.state))].sort()
      setAvailableStates(states)

      // Actualizar el valor máximo de población basado en los datos
      const maxPop = Math.max(...data.map((item) => item.population))
      if (maxPop > filters.maxPopulation) {
        setFilters((prev) => ({
          ...prev,
          maxPopulation: maxPop,
        }))
      }
    }
  }, [data])

  // Aplicar filtros a los datos
  useEffect(() => {
    if (!data || data.length === 0) return

    const applyFilters = () => {
      let filteredData = [...data]

      // Filtrar por población
      filteredData = filteredData.filter(
        (item) => item.population >= filters.minPopulation && item.population <= filters.maxPopulation,
      )

      // Filtrar por porcentaje
      filteredData = filteredData.filter(
        (item) => item.percentage >= filters.minPercentage && item.percentage <= filters.maxPercentage,
      )

      // Filtrar por estados
      if (!filters.includeAllStates && filters.states.length > 0) {
        filteredData = filteredData.filter((item) => filters.states.includes(item.state))
      }

      // Filtrar por ingresos (si hay datos disponibles)
      filteredData = filteredData.filter((item) => {
        if (!item.incomeGroups) return true

        // Estimación aproximada del ingreso medio basado en los grupos
        const totalIncome =
          item.incomeGroups.under25k * 12500 +
          item.incomeGroups.income25kto50k * 37500 +
          item.incomeGroups.income50kto75k * 62500 +
          item.incomeGroups.income75kto100k * 87500 +
          item.incomeGroups.income100kplus * 125000

        const totalPeople =
          item.incomeGroups.under25k +
          item.incomeGroups.income25kto50k +
          item.incomeGroups.income50kto75k +
          item.incomeGroups.income75kto100k +
          item.incomeGroups.income100kplus

        const estimatedMedianIncome = totalPeople > 0 ? totalIncome / totalPeople : 0

        return estimatedMedianIncome >= filters.minIncome && estimatedMedianIncome <= filters.maxIncome
      })

      // Filtrar por nivel educativo
      if (!filters.includeAllEducation && filters.educationLevels.length > 0) {
        filteredData = filteredData.filter((item) => {
          if (!item.educationLevels) return false

          // Verificar si al menos uno de los niveles educativos seleccionados
          // tiene un valor significativo (más del 10% de la población)
          return filters.educationLevels.some((level) => {
            const totalEducation =
              item.educationLevels!.lessHighSchool +
              item.educationLevels!.highSchool +
              item.educationLevels!.someCollege +
              item.educationLevels!.bachelors +
              item.educationLevels!.graduate

            const levelValue = item.educationLevels![level as keyof typeof item.educationLevels]
            return levelValue / totalEducation > 0.1 // Más del 10%
          })
        })
      }

      // Filtrar por grupos de edad
      if (!filters.includeAllAges && filters.ageGroups.length > 0) {
        filteredData = filteredData.filter((item) => {
          if (!item.ageGroups) return false

          // Verificar si al menos uno de los grupos de edad seleccionados
          // tiene un valor significativo (más del 10% de la población)
          return filters.ageGroups.some((ageGroup) => {
            const totalAge =
              item.ageGroups!.under18 +
              item.ageGroups!.age18to24 +
              item.ageGroups!.age25to34 +
              item.ageGroups!.age35to44 +
              item.ageGroups!.age45to54 +
              item.ageGroups!.age55to64 +
              item.ageGroups!.age65plus

            const ageValue = item.ageGroups![ageGroup as keyof typeof item.ageGroups]
            return ageValue / totalAge > 0.1 // Más del 10%
          })
        })
      }

      // Contar filtros activos
      let count = 0
      if (filters.minPopulation > defaultSalvadoranAdvancedFilterOptions.minPopulation) count++
      if (filters.maxPopulation < maxPopulation) count++
      if (filters.minPercentage > defaultSalvadoranAdvancedFilterOptions.minPercentage) count++
      if (filters.maxPercentage < defaultSalvadoranAdvancedFilterOptions.maxPercentage) count++
      if (!filters.includeAllStates && filters.states.length > 0) count++
      if (filters.minIncome > defaultSalvadoranAdvancedFilterOptions.minIncome) count++
      if (filters.maxIncome < defaultSalvadoranAdvancedFilterOptions.maxIncome) count++
      if (!filters.includeAllEducation && filters.educationLevels.length > 0) count++
      if (!filters.includeAllAges && filters.ageGroups.length > 0) count++

      setActiveFilterCount(count)

      // Comparar los datos filtrados con los datos anteriores antes de actualizar
      // para evitar actualizaciones innecesarias
      const currentFilteredDataString = JSON.stringify(filteredData)
      const previousFilteredDataString = JSON.stringify(previousFilteredDataRef.current)

      if (currentFilteredDataString !== previousFilteredDataString) {
        previousFilteredDataRef.current = filteredData
        // Enviar datos filtrados al componente padre
        onFilterChange(filteredData)
      }
    }

    applyFilters()
  }, [data, filters, maxPopulation, onFilterChange])

  // Manejar cambios en los filtros
  const handleFilterChange = (key: keyof SalvadoranAdvancedFilterOptions, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Manejar selección/deselección de estados
  const handleStateToggle = (state: string) => {
    setFilters((prev) => {
      const stateIndex = prev.states.indexOf(state)
      const newStates = [...prev.states]

      if (stateIndex === -1) {
        newStates.push(state)
      } else {
        newStates.splice(stateIndex, 1)
      }

      return {
        ...prev,
        states: newStates,
      }
    })
  }

  // Manejar selección/deselección de niveles educativos
  const handleEducationToggle = (level: string) => {
    setFilters((prev) => {
      const levelIndex = prev.educationLevels.indexOf(level)
      const newLevels = [...prev.educationLevels]

      if (levelIndex === -1) {
        newLevels.push(level)
      } else {
        newLevels.splice(levelIndex, 1)
      }

      return {
        ...prev,
        educationLevels: newLevels,
      }
    })
  }

  // Manejar selección/deselección de grupos de edad
  const handleAgeGroupToggle = (ageGroup: string) => {
    setFilters((prev) => {
      const groupIndex = prev.ageGroups.indexOf(ageGroup)
      const newGroups = [...prev.ageGroups]

      if (groupIndex === -1) {
        newGroups.push(ageGroup)
      } else {
        newGroups.splice(groupIndex, 1)
      }

      return {
        ...prev,
        ageGroups: newGroups,
      }
    })
  }

  // Restablecer filtros a valores predeterminados
  const handleResetFilters = () => {
    setFilters({
      ...defaultSalvadoranAdvancedFilterOptions,
      maxPopulation,
    })
    toast({
      title: "Filtros restablecidos",
      description: "Se han restablecido todos los filtros a sus valores predeterminados.",
    })
  }

  // Guardar configuración de filtros actual
  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Por favor, proporciona un nombre para esta configuración de filtros.",
        variant: "destructive",
      })
      return
    }

    try {
      const newFilter: SavedFilterConfig = {
        name: filterName,
        filters: { ...filters },
        timestamp: Date.now(),
      }

      const updatedFilters = [...savedFilters, newFilter]
      setSavedFilters(updatedFilters)

      localStorage.setItem("salvadoran_saved_filters", JSON.stringify(updatedFilters))

      setIsSaveDialogOpen(false)
      setFilterName("")

      toast({
        title: "Configuración guardada",
        description: `La configuración "${filterName}" ha sido guardada correctamente.`,
      })
    } catch (error) {
      console.error("Error saving filter configuration:", error)
      toast({
        title: "Error al guardar",
        description: "No se pudo guardar la configuración. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  // Cargar una configuración de filtros guardada
  const handleLoadFilter = (config: SavedFilterConfig) => {
    setFilters(config.filters)
    setIsLoadDialogOpen(false)

    toast({
      title: "Configuración cargada",
      description: `La configuración "${config.name}" ha sido aplicada.`,
    })
  }

  // Eliminar una configuración de filtros guardada
  const handleDeleteFilter = (index: number) => {
    try {
      const updatedFilters = [...savedFilters]
      const deletedName = updatedFilters[index].name
      updatedFilters.splice(index, 1)

      setSavedFilters(updatedFilters)
      localStorage.setItem("salvadoran_saved_filters", JSON.stringify(updatedFilters))

      toast({
        title: "Configuración eliminada",
        description: `La configuración "${deletedName}" ha sido eliminada.`,
      })
    } catch (error) {
      console.error("Error deleting filter configuration:", error)
      toast({
        title: "Error al eliminar",
        description: "No se pudo eliminar la configuración. Inténtalo de nuevo.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filtro Avanzado</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Filtros Avanzados</DialogTitle>
              <DialogDescription>
                Personaliza los filtros para refinar los resultados de población salvadoreña.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-grow pr-4">
              <div className="space-y-6 py-4">
                {/* Filtros de población */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Población Salvadoreña</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Mínimo: {filters.minPopulation.toLocaleString()}</span>
                      <span className="text-sm">Máximo: {filters.maxPopulation.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[filters.minPopulation, filters.maxPopulation]}
                      min={0}
                      max={maxPopulation}
                      step={100}
                      onValueChange={(value) => {
                        handleFilterChange("minPopulation", value[0])
                        handleFilterChange("maxPopulation", value[1])
                      }}
                    />
                  </div>
                </div>

                {/* Filtros de porcentaje */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Porcentaje de Población</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Mínimo: {filters.minPercentage}%</span>
                      <span className="text-sm">Máximo: {filters.maxPercentage}%</span>
                    </div>
                    <Slider
                      value={[filters.minPercentage, filters.maxPercentage]}
                      min={0}
                      max={10}
                      step={0.1}
                      onValueChange={(value) => {
                        handleFilterChange("minPercentage", value[0])
                        handleFilterChange("maxPercentage", value[1])
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Filtros de estados */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Estados</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-all-states"
                        checked={filters.includeAllStates}
                        onCheckedChange={(checked) => handleFilterChange("includeAllStates", checked)}
                      />
                      <Label htmlFor="include-all-states">Incluir todos</Label>
                    </div>
                  </div>

                  {!filters.includeAllStates && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableStates.map((state) => (
                        <div key={state} className="flex items-center space-x-2">
                          <Checkbox
                            id={`state-${state}`}
                            checked={filters.states.includes(state)}
                            onCheckedChange={() => handleStateToggle(state)}
                          />
                          <Label htmlFor={`state-${state}`} className="text-sm">
                            {state}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Filtros de ingresos */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Ingreso Estimado</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Mínimo: ${filters.minIncome.toLocaleString()}</span>
                      <span className="text-sm">Máximo: ${filters.maxIncome.toLocaleString()}</span>
                    </div>
                    <Slider
                      value={[filters.minIncome, filters.maxIncome]}
                      min={0}
                      max={150000}
                      step={1000}
                      onValueChange={(value) => {
                        handleFilterChange("minIncome", value[0])
                        handleFilterChange("maxIncome", value[1])
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Filtros de educación */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Nivel Educativo</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-all-education"
                        checked={filters.includeAllEducation}
                        onCheckedChange={(checked) => handleFilterChange("includeAllEducation", checked)}
                      />
                      <Label htmlFor="include-all-education">Incluir todos</Label>
                    </div>
                  </div>

                  {!filters.includeAllEducation && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(educationLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`education-${key}`}
                            checked={filters.educationLevels.includes(key)}
                            onCheckedChange={() => handleEducationToggle(key)}
                          />
                          <Label htmlFor={`education-${key}`} className="text-sm">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Filtros de edad */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Grupos de Edad</h3>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-all-ages"
                        checked={filters.includeAllAges}
                        onCheckedChange={(checked) => handleFilterChange("includeAllAges", checked)}
                      />
                      <Label htmlFor="include-all-ages">Incluir todos</Label>
                    </div>
                  </div>

                  {!filters.includeAllAges && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.entries(ageGroupLabels).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`age-${key}`}
                            checked={filters.ageGroups.includes(key)}
                            onCheckedChange={() => handleAgeGroupToggle(key)}
                          />
                          <Label htmlFor={`age-${key}`} className="text-sm">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="flex justify-between items-center pt-4 border-t">
              <Button variant="outline" onClick={handleResetFilters}>
                Restablecer
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsFilterDialogOpen(false)}>
                  Cerrar
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-1">
                      <Save className="h-4 w-4" />
                      <span>Guardar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Guardar configuración</h4>
                      <div className="space-y-2">
                        <Label htmlFor="filter-name">Nombre de la configuración</Label>
                        <Input
                          id="filter-name"
                          placeholder="Ej: Ciudades grandes en California"
                          value={filterName}
                          onChange={(e) => setFilterName(e.target.value)}
                        />
                      </div>
                      <Button className="w-full" onClick={handleSaveFilter}>
                        Guardar configuración
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-1">
                      <FolderOpen className="h-4 w-4" />
                      <span>Cargar</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="space-y-4">
                      <h4 className="font-medium">Cargar configuración</h4>
                      {savedFilters.length > 0 ? (
                        <ScrollArea className="h-[200px] pr-4">
                          <div className="space-y-2">
                            {savedFilters.map((config, index) => (
                              <Card key={index} className="overflow-hidden">
                                <CardContent className="p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-medium text-sm">{config.name}</h5>
                                      <p className="text-xs text-gray-500">
                                        {new Date(config.timestamp).toLocaleDateString()}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleDeleteFilter(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                  <div className="mt-2 flex justify-end">
                                    <Button size="sm" onClick={() => handleLoadFilter(config)} className="text-xs h-7">
                                      Aplicar
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-gray-500">No hay configuraciones guardadas</div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
