"use client"

import { useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"
import type { LocationData } from "@/types/census"

interface PopulationMapProps {
  data: LocationData[]
  isLoading: boolean
  onSelectLocation?: (location: LocationData) => void
}

export function PopulationMap({ data, isLoading, onSelectLocation }: PopulationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoading || !data.length || !mapRef.current) return

    const initMap = async () => {
      const mapContainer = mapRef.current
      if (!mapContainer) return

      // Obtener los 10 principales lugares por población
      const topLocations = [...data].sort((a, b) => b.population - a.population).slice(0, 10)

      // Calcular el total de población salvadoreña en estos lugares
      const totalPopulation = topLocations.reduce((sum, loc) => sum + loc.population, 0)

      mapContainer.innerHTML = `
        <div class="bg-gray-100 rounded-lg p-4">
          <h3 class="text-lg font-medium mb-4 text-center">Top 10 Ubicaciones con Mayor Población Salvadoreña</h3>
          <p class="text-sm text-gray-600 mb-4 text-center">Total de población salvadoreña en estas ubicaciones: ${totalPopulation.toLocaleString()} personas</p>
          
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            ${topLocations
              .map(
                (location, index) => `
              <div class="bg-white p-4 rounded shadow-sm cursor-pointer hover:bg-gray-50 location-card" data-index="${index}">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-lg">${index + 1}. ${location.name}</div>
                    <div class="text-sm text-gray-600">${location.state}</div>
                  </div>
                  <div class="text-right">
                    <div class="font-bold">${location.population.toLocaleString()}</div>
                    <div class="text-sm text-gray-600">${location.percentage}% de la población</div>
                  </div>
                </div>
                <div class="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                  <div class="bg-green-600 h-2.5 rounded-full" style="width: ${Math.min(100, location.percentage)}%"></div>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          
          <div class="mt-6 text-center text-sm text-gray-500">
            Nota: En una implementación completa, se mostraría un mapa interactivo con la distribución geográfica.
          </div>
        </div>
      `

      // Agregar event listeners para las tarjetas de ubicación
      if (onSelectLocation) {
        const locationCards = mapContainer.querySelectorAll(".location-card")
        locationCards.forEach((card) => {
          card.addEventListener("click", () => {
            const index = Number.parseInt(card.getAttribute("data-index") || "0", 10)
            onSelectLocation(topLocations[index])
          })
        })
      }
    }

    initMap()
  }, [data, isLoading, onSelectLocation])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">Cargando mapa...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return <div className="text-center py-8 text-gray-500">No se encontraron datos para la búsqueda actual.</div>
  }

  return (
    <div className="h-[500px] bg-gray-50 rounded-lg border" ref={mapRef}>
      {/* Map will be rendered here */}
    </div>
  )
}
