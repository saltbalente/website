"use client"

import { useState } from "react"
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

interface ApiKeyConfigProps {
  onApiKeyChange?: (apiKey: string) => void
}

export function ApiKeyConfig({ onApiKeyChange }: ApiKeyConfigProps) {
  const [apiKey, setApiKey] = useState("")
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"none" | "success" | "error">("none")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState(false)

  // Verificar si ya hay una API key guardada en localStorage al cargar el componente
  useState(() => {
    const storedApiKey = localStorage.getItem("census_api_key")
    if (storedApiKey) {
      setSavedApiKey(storedApiKey)
      setApiKey(storedApiKey)
      if (onApiKeyChange) {
        onApiKeyChange(storedApiKey)
      }
    }
  })

  const validateApiKey = async () => {
    if (!apiKey.trim()) {
      setErrorMessage("Por favor, ingresa una API key")
      return
    }

    setIsValidating(true)
    setConnectionStatus("none")
    setErrorMessage(null)

    try {
      // Realizar una solicitud de prueba a la API del Census Bureau
      const baseUrl = "https://api.census.gov/data/2021/acs/acs5"
      const url = `${baseUrl}?get=NAME&for=state:06&key=${apiKey}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status} ${response.statusText}`)
      }

      // Verificar que la respuesta tenga el formato esperado
      const data = await response.json()
      if (!Array.isArray(data) || data.length < 2) {
        throw new Error("La API devolvió un formato de datos inesperado")
      }

      // Si llegamos aquí, la API key es válida
      setConnectionStatus("success")
      setSavedApiKey(apiKey)
      localStorage.setItem("census_api_key", apiKey)

      // Notificar al componente padre sobre el cambio de API key
      if (onApiKeyChange) {
        onApiKeyChange(apiKey)
      }
    } catch (error) {
      console.error("Error validando API key:", error)
      setConnectionStatus("error")
      setErrorMessage(
        error instanceof Error ? error.message : "Error desconocido al validar la API key. Verifica que sea correcta.",
      )
    } finally {
      setIsValidating(false)
    }
  }

  const copyApiKey = () => {
    if (savedApiKey) {
      navigator.clipboard.writeText(savedApiKey)
    }
  }

  const clearApiKey = () => {
    setApiKey("")
    setSavedApiKey(null)
    localStorage.removeItem("census_api_key")
    setConnectionStatus("none")

    // Notificar al componente padre sobre el cambio de API key
    if (onApiKeyChange) {
      onApiKeyChange("")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Configuración de API Key</CardTitle>
            <CardDescription>Configura tu clave de API del Census Bureau</CardDescription>
          </div>
          {savedApiKey && (
            <Badge
              variant={
                connectionStatus === "success" ? "success" : connectionStatus === "error" ? "destructive" : "outline"
              }
              className="ml-2"
            >
              {connectionStatus === "success" ? (
                <span className="flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  Conectado
                </span>
              ) : connectionStatus === "error" ? (
                <span className="flex items-center">
                  <X className="h-3 w-3 mr-1" />
                  Error
                </span>
              ) : (
                "No verificado"
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="api-key" className="text-sm font-medium">
            Census Bureau API Key
          </label>
          <div className="flex">
            <div className="relative flex-1">
              <Input
                id="api-key"
                type={showApiKey ? "text" : "password"}
                placeholder="Ingresa tu API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={validateApiKey} disabled={isValidating || !apiKey.trim()} className="ml-2">
              {isValidating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Conectar
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            Obtén tu API key en{" "}
            <a
              href="https://api.census.gov/data/key_signup.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              api.census.gov
            </a>
          </p>
        </div>

        {errorMessage && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {connectionStatus === "success" && (
          <Alert variant="success" className="bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4" />
            <AlertTitle>Conexión exitosa</AlertTitle>
            <AlertDescription>
              Tu API key ha sido validada correctamente y guardada para futuras consultas.
            </AlertDescription>
          </Alert>
        )}

        {savedApiKey && (
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium">API Key guardada</h4>
                <p className="text-xs text-gray-500">
                  {showApiKey
                    ? savedApiKey
                    : savedApiKey.substring(0, 4) +
                      "•".repeat(savedApiKey.length - 8) +
                      savedApiKey.substring(savedApiKey.length - 4)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyApiKey} title="Copiar API key">
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button variant="outline" size="sm" onClick={clearApiKey} title="Eliminar API key">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500 flex flex-col items-start">
        <p>La API key se guarda localmente en tu navegador y nunca se comparte con terceros.</p>
      </CardFooter>
    </Card>
  )
}
