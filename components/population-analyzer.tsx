"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MexicanPopulationDashboard } from "@/components/mexican-population-dashboard"
import { SalvadoranPopulationDashboard } from "@/components/salvadoran-population-dashboard"

export function PopulationAnalyzer() {
  return (
    <Tabs defaultValue="mexican" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-8">
        <TabsTrigger value="mexican">Población Mexicana</TabsTrigger>
        <TabsTrigger value="salvadoran">Población Salvadoreña</TabsTrigger>
      </TabsList>
      <TabsContent value="mexican">
        <MexicanPopulationDashboard />
      </TabsContent>
      <TabsContent value="salvadoran">
        <SalvadoranPopulationDashboard />
      </TabsContent>
    </Tabs>
  )
}
