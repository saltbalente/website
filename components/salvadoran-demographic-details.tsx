"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { LocationData } from "@/types/census"

interface DemographicDetailsProps {
  location: LocationData
}

export function DemographicDetails({ location }: DemographicDetailsProps) {
  // Preparar datos para los gráficos
  const ageData = location.ageGroups
    ? [
        { name: "< 18", value: location.ageGroups.under18 },
        { name: "18-24", value: location.ageGroups.age18to24 },
        { name: "25-34", value: location.ageGroups.age25to34 },
        { name: "35-44", value: location.ageGroups.age35to44 },
        { name: "45-54", value: location.ageGroups.age45to54 },
        { name: "55-64", value: location.ageGroups.age55to64 },
        { name: "65+", value: location.ageGroups.age65plus },
      ]
    : []

  const incomeData = location.incomeGroups
    ? [
        { name: "< $25k", value: location.incomeGroups.under25k },
        { name: "$25-50k", value: location.incomeGroups.income25kto50k },
        { name: "$50-75k", value: location.incomeGroups.income50kto75k },
        { name: "$75-100k", value: location.incomeGroups.income75kto100k },
        { name: "> $100k", value: location.incomeGroups.income100kplus },
      ]
    : []

  const educationData = location.educationLevels
    ? [
        { name: "< Secundaria", value: location.educationLevels.lessHighSchool },
        { name: "Secundaria", value: location.educationLevels.highSchool },
        { name: "Algo Univ.", value: location.educationLevels.someCollege },
        { name: "Licenciatura", value: location.educationLevels.bachelors },
        { name: "Posgrado", value: location.educationLevels.graduate },
      ]
    : []

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-xl font-bold">{location.name}</h3>
        <p className="text-gray-500">{location.state}</p>
        <div className="mt-2 flex justify-center gap-4">
          <div>
            <p className="text-2xl font-bold">{location.population.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Población Salvadoreña</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{location.percentage}%</p>
            <p className="text-xs text-gray-500">Del Total</p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-2">Distribución por Edad</h4>
          <div className="h-[180px]">
            <ChartContainer
              config={{
                value: {
                  label: "Población",
                  color: "hsl(var(--chart-1))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis width={40} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-2">Distribución por Ingresos</h4>
          <div className="h-[180px]">
            <ChartContainer
              config={{
                value: {
                  label: "Población",
                  color: "hsl(var(--chart-2))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis width={40} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h4 className="text-sm font-medium mb-2">Nivel Educativo</h4>
          <div className="h-[180px]">
            <ChartContainer
              config={{
                value: {
                  label: "Población",
                  color: "hsl(var(--chart-3))",
                },
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={educationData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis width={40} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
