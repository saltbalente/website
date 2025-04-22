"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MexicanPopulationDashboard } from "@/components/mexican-population-dashboard"
import { SalvadoranPopulationDashboard } from "@/components/salvadoran-population-dashboard"

export function PopulationAnalyzer() {
  const [activeTab, setActiveTab] = useState("mexican")

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <Tabs defaultValue="mexican" className="w-full" onValueChange={setActiveTab}>
        <div className="container mx-auto py-4">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="mexican">Población Mexicana</TabsTrigger>
            <TabsTrigger value="salvadoran">Población Salvadoreña</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="mexican" className="bg-[#121212]">
          <MexicanPopulationDashboard />
        </TabsContent>

        <TabsContent value="salvadoran" className="bg-[#121212]">
          <SalvadoranPopulationDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
