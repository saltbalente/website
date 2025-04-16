"use client"

import { Loader2 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { LocationData } from "@/types/census"

interface PopulationChartProps {
  data: LocationData[]
  isLoading: boolean
}

export function PopulationChart({ data, isLoading }: PopulationChartProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando gráficos...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No se encontraron datos para la búsqueda actual.</div>
  }

  // Prepare data for the chart - take top 10 locations by population
  const chartData = [...data]
    .sort((a, b) => b.population - a.population)
    .slice(0, 10)
    .map((location) => ({
      name: location.name,
      population: location.population,
      percentage: location.percentage,
    }))

  // Agrupar datos por estado para el segundo gráfico
  const stateData = data.reduce(
    (acc, location) => {
      if (!acc[location.state]) {
        acc[location.state] = {
          state: location.state,
          population: 0,
          locations: 0,
        }
      }
      acc[location.state].population += location.population
      acc[location.state].locations += 1
      return acc
    },
    {} as Record<string, { state: string; population: number; locations: number }>,
  )

  // Convertir a array y ordenar por población
  const topStates = Object.values(stateData)
    .sort((a, b) => b.population - a.population)
    .slice(0, 5)
    .map((item) => ({
      name: item.state,
      population: item.population,
      locations: item.locations,
    }))

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-4">Top 10 Ubicaciones por Población Mexicana</h3>
        <div className="h-[400px]">
          <ChartContainer
            config={{
              population: {
                label: "Población Mexicana",
                color: "hsl(var(--chart-1))",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="population"
                  name="Población Mexicana"
                  fill="var(--color-population)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-4">Top 5 Estados por Población Mexicana</h3>
        <div className="h-[350px]">
          <ChartContainer
            config={{
              population: {
                label: "Población Mexicana",
                color: "hsl(var(--chart-2))",
              },
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStates} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar
                  dataKey="population"
                  name="Población Mexicana"
                  fill="var(--color-population)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        <div className="mt-4 text-sm text-gray-500 text-center">
          Datos basados en la American Community Survey (ACS) del U.S. Census Bureau
        </div>
      </div>
    </div>
  )
}
