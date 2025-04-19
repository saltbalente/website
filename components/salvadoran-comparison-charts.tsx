"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, Info } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { LocationData } from "@/types/census"

interface SalvadoranComparisonChartsProps {
  data: LocationData[]
  stateData?: any[]
}

export function SalvadoranComparisonCharts({ data, stateData }: SalvadoranComparisonChartsProps) {
  const [chartType, setChartType] = useState<"population" | "percentage" | "income">("population")
  const [viewMode, setViewMode] = useState<"cities" | "states">("cities")
  const [displayCount, setDisplayCount] = useState<number>(10)

  // Preparar datos para los gráficos
  const prepareChartData = () => {
    if (viewMode === "cities") {
      // Datos de ciudades
      return [...data]
        .sort((a, b) => {
          if (chartType === "population") return b.population - a.population
          if (chartType === "percentage") return b.percentage - a.percentage
          return (b.incomeGroups?.income100kplus || 0) - (a.incomeGroups?.income100kplus || 0)
        })
        .slice(0, displayCount)
        .map((location) => ({
          name: location.name,
          population: location.population,
          percentage: location.percentage,
          income: location.incomeGroups?.income100kplus || 0,
        }))
    } else {
      // Datos de estados
      if (!stateData || stateData.length === 0) {
        return []
      }

      return [...stateData]
        .sort((a, b) => {
          if (chartType === "population") return b.salvadoranPopulation - a.salvadoranPopulation
          if (chartType === "percentage") return b.percentage - a.percentage
          return b.medianIncome - a.medianIncome
        })
        .slice(0, displayCount)
        .map((state) => ({
          name: state.stateName,
          population: state.salvadoranPopulation,
          percentage: state.percentage,
          income: state.medianIncome,
          citiesCount: state.citiesCount || 0,
        }))
    }
  }

  const chartData = prepareChartData()

  // Colores para los gráficos
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#A4DE6C",
    "#D0ED57",
    "#FFC658",
    "#FF7300",
  ]

  // Función para exportar los datos del gráfico como CSV
  const exportChartData = () => {
    if (chartData.length === 0) return

    // Crear encabezados para el CSV
    const headers = ["Nombre"]
    if (chartType === "population") headers.push("Población Salvadoreña")
    if (chartType === "percentage") headers.push("Porcentaje")
    if (chartType === "income") headers.push("Ingreso")
    if (viewMode === "states") headers.push("Número de Ciudades")

    // Crear contenido CSV
    let csvContent = headers.join(",") + "\n"

    // Añadir filas de datos
    csvContent += chartData
      .map((item) => {
        const row = [item.name]
        if (chartType === "population") row.push(item.population.toString())
        if (chartType === "percentage") row.push(item.percentage.toString())
        if (chartType === "income") row.push(item.income.toString())
        if (viewMode === "states") row.push(item.citiesCount.toString())
        return row.join(",")
      })
      .join("\n")

    // Crear un blob con el contenido CSV
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })

    // Crear un enlace para descargar el archivo
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    // Configurar el enlace
    link.setAttribute("href", url)
    link.setAttribute(
      "download",
      `datos_comparativos_salvadorenos_${viewMode === "cities" ? "ciudades" : "estados"}_${chartType}.csv`,
    )

    // Añadir el enlace al documento, hacer clic y luego eliminarlo
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Renderizar gráfico de barras
  const renderBarChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No hay datos suficientes para mostrar el gráfico
        </div>
      )
    }

    const dataKey = chartType === "population" ? "population" : chartType === "percentage" ? "percentage" : "income"
    const label =
      chartType === "population"
        ? "Población Salvadoreña"
        : chartType === "percentage"
          ? "Porcentaje de Población Salvadoreña"
          : "Ingreso Medio"

    return (
      <div className="h-[400px]">
        <ChartContainer
          config={{
            [dataKey]: {
              label,
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
              <Bar dataKey={dataKey} name={label} fill="var(--color-population)" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    )
  }

  // Renderizar gráfico de líneas
  const renderLineChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No hay datos suficientes para mostrar el gráfico
        </div>
      )
    }

    const dataKey = chartType === "population" ? "population" : chartType === "percentage" ? "percentage" : "income"
    const label =
      chartType === "population"
        ? "Población Salvadoreña"
        : chartType === "percentage"
          ? "Porcentaje de Población Salvadoreña"
          : "Ingreso Medio"

    return (
      <div className="h-[400px]">
        <ChartContainer
          config={{
            [dataKey]: {
              label,
              color: "hsl(var(--chart-2))",
            },
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                name={label}
                stroke="var(--color-population)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    )
  }

  // Renderizar gráfico circular
  const renderPieChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          No hay datos suficientes para mostrar el gráfico
        </div>
      )
    }

    const dataKey = chartType === "population" ? "population" : chartType === "percentage" ? "percentage" : "income"
    const label =
      chartType === "population"
        ? "Población Salvadoreña"
        : chartType === "percentage"
          ? "Porcentaje de Población Salvadoreña"
          : "Ingreso Medio"

    // Limitar a 5 elementos para el gráfico circular para mejor visualización
    const pieData = chartData.slice(0, 5)

    return (
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={150}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey="name"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, label]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gráficos Comparativos de Población Salvadoreña</CardTitle>
        <CardDescription>
          Visualiza y compara datos demográficos de la población salvadoreña en diferentes ubicaciones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label htmlFor="chart-type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Datos
            </label>
            <Select
              value={chartType}
              onValueChange={(value: "population" | "percentage" | "income") => setChartType(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar datos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="population">Población Salvadoreña</SelectItem>
                <SelectItem value="percentage">Porcentaje</SelectItem>
                <SelectItem value="income">Ingreso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 mb-1">
              Modo de Vista
            </label>
            <Select value={viewMode} onValueChange={(value: "cities" | "states") => setViewMode(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar vista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cities">Ciudades</SelectItem>
                <SelectItem value="states">Estados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="display-count" className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad a Mostrar
            </label>
            <Select value={displayCount.toString()} onValueChange={(value) => setDisplayCount(Number.parseInt(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Cantidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto self-end">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={exportChartData}
              disabled={chartData.length === 0}
            >
              <Download className="h-4 w-4" />
              Exportar Datos
            </Button>
          </div>
        </div>

        {viewMode === "states" && (!stateData || stateData.length === 0) ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start mb-6">
            <Info className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-800">Datos de estados no disponibles</h4>
              <p className="text-yellow-700 text-sm">
                Para ver comparaciones entre estados, primero debes realizar una búsqueda de comparación de estados en
                la sección "Comparar Estados".
              </p>
            </div>
          </div>
        ) : null}

        <Tabs defaultValue="bar" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="bar">Gráfico de Barras</TabsTrigger>
            <TabsTrigger value="line">Gráfico de Líneas</TabsTrigger>
            <TabsTrigger value="pie">Gráfico Circular</TabsTrigger>
          </TabsList>

          <TabsContent value="bar">{renderBarChart()}</TabsContent>

          <TabsContent value="line">{renderLineChart()}</TabsContent>

          <TabsContent value="pie">{renderPieChart()}</TabsContent>
        </Tabs>

        <div className="mt-6 text-sm text-gray-500">
          <p className="mb-2">
            <strong>Nota:</strong> Estos gráficos muestran datos específicos de la población salvadoreña basados en el
            Censo de EE.UU.
          </p>
          <p>
            Los datos de porcentaje representan la proporción de salvadoreños respecto a la población total en cada
            ubicación.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
