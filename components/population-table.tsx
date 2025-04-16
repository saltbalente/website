"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp, Download, Loader2 } from "lucide-react"
import type { LocationData } from "@/types/census"

interface PopulationTableProps {
  data: LocationData[]
  isLoading: boolean
  onSelectLocation?: (location: LocationData) => void
}

export function PopulationTable({ data, isLoading, onSelectLocation }: PopulationTableProps) {
  const [sortField, setSortField] = useState<keyof LocationData>("population")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)

  const handleSort = (field: keyof LocationData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedData = [...data].sort((a, b) => {
    if (sortDirection === "asc") {
      return a[sortField] > b[sortField] ? 1 : -1
    } else {
      return a[sortField] < b[sortField] ? 1 : -1
    }
  })

  const exportToCsv = () => {
    const headers = ["Ubicación", "Estado", "Población Mexicana", "Porcentaje", "Código Postal"]
    const csvContent = [
      headers.join(","),
      ...sortedData.map((item) =>
        [`"${item.name}"`, `"${item.state}"`, item.population, `${item.percentage}%`, item.zipCode].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "poblacion_mexicana_usa.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRowClick = (location: LocationData) => {
    const locationId = `${location.name}-${location.zipCode}`
    setSelectedLocationId(locationId)
    if (onSelectLocation) {
      onSelectLocation(location)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando datos...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No se encontraron datos para la búsqueda actual.</div>
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" size="sm" onClick={exportToCsv} className="flex items-center gap-1">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("name")}>
                <div className="flex items-center">
                  Ubicación
                  {sortField === "name" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="cursor-pointer hover:bg-gray-50" onClick={() => handleSort("state")}>
                <div className="flex items-center">
                  Estado
                  {sortField === "state" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("population")}
              >
                <div className="flex items-center justify-end">
                  Población Mexicana
                  {sortField === "population" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead
                className="text-right cursor-pointer hover:bg-gray-50"
                onClick={() => handleSort("percentage")}
              >
                <div className="flex items-center justify-end">
                  Porcentaje
                  {sortField === "percentage" &&
                    (sortDirection === "asc" ? (
                      <ChevronUp className="ml-1 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-1 h-4 w-4" />
                    ))}
                </div>
              </TableHead>
              <TableHead className="text-right">Código Postal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((location) => {
              const locationId = `${location.name}-${location.zipCode}`
              const isSelected = locationId === selectedLocationId

              return (
                <TableRow
                  key={locationId}
                  className={`cursor-pointer ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  onClick={() => handleRowClick(location)}
                >
                  <TableCell className="font-medium">{location.name}</TableCell>
                  <TableCell>{location.state}</TableCell>
                  <TableCell className="text-right">{location.population.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{location.percentage}%</TableCell>
                  <TableCell className="text-right">{location.zipCode}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
