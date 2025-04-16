"use client"

import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DemographicFiltersProps {
  onFilterChange: (filters: {
    ageRange: string[]
    incomeRange: string[]
    educationLevel: string[]
  }) => void
}

const ageOptions = [
  { value: "under18", label: "Menores de 18 años" },
  { value: "18to24", label: "18 a 24 años" },
  { value: "25to34", label: "25 a 34 años" },
  { value: "35to44", label: "35 a 44 años" },
  { value: "45to54", label: "45 a 54 años" },
  { value: "55to64", label: "55 a 64 años" },
  { value: "65plus", label: "65 años o más" },
]

const incomeOptions = [
  { value: "under25k", label: "Menos de $25,000" },
  { value: "25kto50k", label: "$25,000 a $50,000" },
  { value: "50kto75k", label: "$50,000 a $75,000" },
  { value: "75kto100k", label: "$75,000 a $100,000" },
  { value: "100kplus", label: "Más de $100,000" },
]

const educationOptions = [
  { value: "lessHighSchool", label: "Menos que secundaria" },
  { value: "highSchool", label: "Secundaria completa" },
  { value: "someCollege", label: "Algo de universidad" },
  { value: "bachelors", label: "Licenciatura" },
  { value: "graduate", label: "Posgrado" },
]

export function DemographicFilters({ onFilterChange }: DemographicFiltersProps) {
  const [ageOpen, setAgeOpen] = useState(false)
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [educationOpen, setEducationOpen] = useState(false)

  const [selectedAges, setSelectedAges] = useState<string[]>([])
  const [selectedIncomes, setSelectedIncomes] = useState<string[]>([])
  const [selectedEducation, setSelectedEducation] = useState<string[]>([])

  const handleAgeSelect = (value: string) => {
    const newSelection = selectedAges.includes(value)
      ? selectedAges.filter((item) => item !== value)
      : [...selectedAges, value]

    setSelectedAges(newSelection)
    updateFilters(newSelection, selectedIncomes, selectedEducation)
  }

  const handleIncomeSelect = (value: string) => {
    const newSelection = selectedIncomes.includes(value)
      ? selectedIncomes.filter((item) => item !== value)
      : [...selectedIncomes, value]

    setSelectedIncomes(newSelection)
    updateFilters(selectedAges, newSelection, selectedEducation)
  }

  const handleEducationSelect = (value: string) => {
    const newSelection = selectedEducation.includes(value)
      ? selectedEducation.filter((item) => item !== value)
      : [...selectedEducation, value]

    setSelectedEducation(newSelection)
    updateFilters(selectedAges, selectedIncomes, newSelection)
  }

  const updateFilters = (ages: string[], incomes: string[], education: string[]) => {
    onFilterChange({
      ageRange: ages,
      incomeRange: incomes,
      educationLevel: education,
    })
  }

  const clearFilters = () => {
    setSelectedAges([])
    setSelectedIncomes([])
    setSelectedEducation([])
    updateFilters([], [], [])
  }

  const getAgeLabel = () => {
    if (selectedAges.length === 0) return "Todas las edades"
    if (selectedAges.length === 1) {
      return ageOptions.find((option) => option.value === selectedAges[0])?.label
    }
    return `${selectedAges.length} rangos seleccionados`
  }

  const getIncomeLabel = () => {
    if (selectedIncomes.length === 0) return "Todos los ingresos"
    if (selectedIncomes.length === 1) {
      return incomeOptions.find((option) => option.value === selectedIncomes[0])?.label
    }
    return `${selectedIncomes.length} rangos seleccionados`
  }

  const getEducationLabel = () => {
    if (selectedEducation.length === 0) return "Todos los niveles"
    if (selectedEducation.length === 1) {
      return educationOptions.find((option) => option.value === selectedEducation[0])?.label
    }
    return `${selectedEducation.length} niveles seleccionados`
  }

  const hasActiveFilters = selectedAges.length > 0 || selectedIncomes.length > 0 || selectedEducation.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Popover open={ageOpen} onOpenChange={setAgeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {getAgeLabel()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar edad..." />
              <CommandList>
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                <CommandGroup>
                  {ageOptions.map((option) => (
                    <CommandItem key={option.value} value={option.value} onSelect={() => handleAgeSelect(option.value)}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedAges.includes(option.value) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={incomeOpen} onOpenChange={setIncomeOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {getIncomeLabel()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar ingresos..." />
              <CommandList>
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                <CommandGroup>
                  {incomeOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleIncomeSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedIncomes.includes(option.value) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={educationOpen} onOpenChange={setEducationOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="justify-between">
              {getEducationLabel()}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0">
            <Command>
              <CommandInput placeholder="Buscar nivel educativo..." />
              <CommandList>
                <CommandEmpty>No se encontraron resultados.</CommandEmpty>
                <CommandGroup>
                  {educationOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => handleEducationSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedEducation.includes(option.value) ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters} className="h-10">
            Limpiar filtros
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {selectedAges.map((age) => (
            <Badge key={`age-${age}`} variant="secondary" className="text-xs">
              {ageOptions.find((option) => option.value === age)?.label}
            </Badge>
          ))}
          {selectedIncomes.map((income) => (
            <Badge key={`income-${income}`} variant="secondary" className="text-xs">
              {incomeOptions.find((option) => option.value === income)?.label}
            </Badge>
          ))}
          {selectedEducation.map((education) => (
            <Badge key={`education-${education}`} variant="secondary" className="text-xs">
              {educationOptions.find((option) => option.value === education)?.label}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
