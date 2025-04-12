"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Copy, Trash, ArrowRight } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

export default function StyleScriptCombiner() {
  // Estado para CSS
  const [combineInput, setCombineInput] = useState("")
  const [combineOutput, setCombineOutput] = useState("")
  const [extractInput, setExtractInput] = useState("")
  const [extractOutput, setExtractOutput] = useState("")
  const [animationInput, setAnimationInput] = useState("")
  const [animationOutput, setAnimationOutput] = useState("")
  const [animationMode, setAnimationMode] = useState("minimize")

  // Estado para JavaScript
  const [jsInput, setJsInput] = useState("")
  const [jsOutput, setJsOutput] = useState("")
  const [jsExtractInput, setJsExtractInput] = useState("")
  const [jsExtractOutput, setJsExtractOutput] = useState("")

  // Estado compartido
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")
  const [extractError, setExtractError] = useState("")
  const [animationError, setAnimationError] = useState("")
  const [jsError, setJsError] = useState("")
  const [jsExtractError, setJsExtractError] = useState("")
  const [activeTab, setActiveTab] = useState("css")
  const [activeCssTab, setActiveCssTab] = useState("combine")
  const [activeJsTab, setActiveJsTab] = useState("combine")

  // Funciones para CSS
  const combineStyles = () => {
    try {
      setError("")

      // Expresión regular para extraer el contenido de las etiquetas style
      const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
      let match
      let combinedCSS = ""

      // Extraer todo el CSS de las etiquetas style
      while ((match = styleRegex.exec(combineInput)) !== null) {
        combinedCSS += match[1].trim() + "\n\n"
      }

      if (!combinedCSS) {
        setError("No se encontraron etiquetas <style> válidas en el texto ingresado.")
        setCombineOutput("")
        return
      }

      // Crear la etiqueta style combinada
      const result = `<style>\n${combinedCSS.trim()}\n</style>`
      setCombineOutput(result)
    } catch (err) {
      setError("Ocurrió un error al procesar las etiquetas de estilo.")
      console.error(err)
    }
  }

  const extractStyles = () => {
    try {
      setExtractError("")

      // Expresión regular para extraer las etiquetas style completas
      const styleRegex = /<style[^>]*>[\s\S]*?<\/style>/gi
      const matches = extractInput.match(styleRegex)

      if (!matches || matches.length === 0) {
        setExtractError("No se encontraron etiquetas <style> en el código HTML.")
        setExtractOutput("")
        return
      }

      // Unir todas las etiquetas style encontradas
      const result = matches.join("\n\n")
      setExtractOutput(result)
    } catch (err) {
      setExtractError("Ocurrió un error al extraer las etiquetas de estilo.")
      console.error(err)
    }
  }

  const compressAnimations = () => {
    try {
      setAnimationError("")

      // Verificar si hay contenido
      if (!animationInput.trim()) {
        setAnimationError("Por favor, ingresa código CSS con animaciones.")
        setAnimationOutput("")
        return
      }

      // Expresión regular para encontrar bloques @keyframes
      const keyframesRegex = /@keyframes\s+([a-zA-Z0-9_-]+)\s*{([^}]*)}/g

      let result = animationInput
      let animationsFound = false

      if (animationMode === "remove") {
        // Eliminar completamente las animaciones
        result = result.replace(keyframesRegex, "")

        // También eliminar las referencias a las animaciones
        result = result.replace(/animation\s*:([^;]*);/g, "")
        result = result.replace(/animation-[a-zA-Z-]+\s*:([^;]*);/g, "")

        animationsFound = result !== animationInput
      } else if (animationMode === "minimize") {
        // Minimizar las animaciones (mantener solo 0% y 100%)
        result = result.replace(keyframesRegex, (match, animationName, keyframesContent) => {
          // Buscar los keyframes 0% y 100%
          const fromRegex = /\b(0%|from)\s*{([^}]*)}/
          const toRegex = /\b(100%|to)\s*{([^}]*)}/

          const fromMatch = keyframesContent.match(fromRegex)
          const toMatch = keyframesContent.match(toRegex)

          let minimizedContent = ""

          if (fromMatch) {
            minimizedContent += fromMatch[0] + "\n  "
          }

          if (toMatch) {
            minimizedContent += toMatch[0]
          }

          // Si no se encontraron 0% o 100%, mantener el primer y último keyframe
          if (!minimizedContent) {
            const keyframes = keyframesContent.match(/\b([0-9]+%|from|to)\s*{([^}]*)}/g)
            if (keyframes && keyframes.length > 0) {
              if (keyframes.length === 1) {
                minimizedContent = keyframes[0]
              } else {
                minimizedContent = keyframes[0] + "\n  " + keyframes[keyframes.length - 1]
              }
            }
          }

          return `@keyframes ${animationName} {\n  ${minimizedContent}\n}`
        })

        animationsFound = result !== animationInput
      }

      if (!animationsFound) {
        setAnimationError("No se encontraron animaciones (@keyframes) en el CSS.")
        setAnimationOutput("")
        return
      }

      // Limpiar espacios en blanco múltiples y líneas vacías
      result = result.replace(/\n\s*\n\s*\n/g, "\n\n").trim()

      setAnimationOutput(result)
    } catch (err) {
      setAnimationError("Ocurrió un error al procesar las animaciones CSS.")
      console.error(err)
    }
  }

  // Funciones para JavaScript
  const combineScripts = () => {
    try {
      setJsError("")

      // Expresión regular para extraer el contenido de las etiquetas script
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi
      let match
      let combinedJS = ""

      // Extraer todo el JS de las etiquetas script
      while ((match = scriptRegex.exec(jsInput)) !== null) {
        combinedJS += match[1].trim() + "\n\n"
      }

      if (!combinedJS) {
        setJsError("No se encontraron etiquetas <script> válidas en el texto ingresado.")
        setJsOutput("")
        return
      }

      // Crear la etiqueta script combinada
      const result = `<script>\n${combinedJS.trim()}\n</script>`
      setJsOutput(result)
    } catch (err) {
      setJsError("Ocurrió un error al procesar las etiquetas de script.")
      console.error(err)
    }
  }

  const extractScripts = () => {
    try {
      setJsExtractError("")

      // Expresión regular para extraer solo las etiquetas <script> sin atributos
      const scriptRegex = /<script>[\s\S]*?<\/script>/gi
      const matches = jsExtractInput.match(scriptRegex)

      if (!matches || matches.length === 0) {
        setJsExtractError("No se encontraron etiquetas <script> sin atributos en el código HTML.")
        setJsExtractOutput("")
        return
      }

      // Unir todas las etiquetas script encontradas
      const result = matches.join("\n\n")
      setJsExtractOutput(result)
    } catch (err) {
      setJsExtractError("Ocurrió un error al extraer las etiquetas de script.")
      console.error(err)
    }
  }

  // Funciones compartidas
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Funciones de limpieza
  const clearCombine = () => {
    setCombineInput("")
    setCombineOutput("")
    setError("")
  }

  const clearExtract = () => {
    setExtractInput("")
    setExtractOutput("")
    setExtractError("")
  }

  const clearAnimation = () => {
    setAnimationInput("")
    setAnimationOutput("")
    setAnimationError("")
  }

  const clearJsCombine = () => {
    setJsInput("")
    setJsOutput("")
    setJsError("")
  }

  const clearJsExtract = () => {
    setJsExtractInput("")
    setJsExtractOutput("")
    setJsExtractError("")
  }

  // Funciones de transferencia
  const transferToCombine = () => {
    setCombineInput(extractOutput)
    setActiveCssTab("combine")
  }

  const transferToJsCombine = () => {
    setJsInput(jsExtractOutput)
    setActiveJsTab("combine")
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Herramienta de Estilos y Scripts</h1>

      <Tabs defaultValue="css" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="css">CSS</TabsTrigger>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
        </TabsList>

        {/* Pestaña de CSS */}
        <TabsContent value="css">
          <Tabs defaultValue="combine" value={activeCssTab} onValueChange={setActiveCssTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="combine" className="flex-1">
                Combinar Estilos
              </TabsTrigger>
              <TabsTrigger value="extract" className="flex-1">
                Extraer Estilos
              </TabsTrigger>
              <TabsTrigger value="animations" className="flex-1">
                Comprimir Animaciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="combine">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Entrada</CardTitle>
                    <CardDescription>Pega aquí tus múltiples etiquetas &lt;style&gt;</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="<style>body { color: red; }</style>
<style>h1 { font-size: 24px; }</style>"
                      className="min-h-[300px] font-mono"
                      value={combineInput}
                      onChange={(e) => setCombineInput(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={clearCombine}>
                      <Trash className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                    <Button onClick={combineStyles}>Combinar Estilos</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resultado</CardTitle>
                    <CardDescription>Etiqueta style combinada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <div className="relative">
                      <Textarea readOnly className="min-h-[300px] font-mono" value={combineOutput} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      onClick={() => copyToClipboard(combineOutput)}
                      disabled={!combineOutput}
                      variant={copied ? "outline" : "default"}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar al Portapapeles
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="extract">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Código HTML</CardTitle>
                    <CardDescription>Pega aquí tu código HTML completo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="<!DOCTYPE html>
<html>
<head>
  <style>body { color: red; }</style>
</head>
<body>
  <style>h1 { font-size: 24px; }</style>
  <h1>Título</h1>
</body>
</html>"
                      className="min-h-[300px] font-mono"
                      value={extractInput}
                      onChange={(e) => setExtractInput(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={clearExtract}>
                      <Trash className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                    <Button onClick={extractStyles}>Extraer Estilos</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Estilos Extraídos</CardTitle>
                    <CardDescription>Etiquetas style encontradas en el HTML</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {extractError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{extractError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="relative">
                      <Textarea readOnly className="min-h-[300px] font-mono" value={extractOutput} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button onClick={transferToCombine} disabled={!extractOutput} variant="outline">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Transferir a Combinador
                    </Button>
                    <Button onClick={() => copyToClipboard(extractOutput)} disabled={!extractOutput}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="animations">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>CSS con Animaciones</CardTitle>
                    <CardDescription>Pega aquí tu CSS que contiene animaciones (@keyframes)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Textarea
                      placeholder="@keyframes fadeIn {
  0% { opacity: 0; }
  25% { opacity: 0.25; }
  50% { opacity: 0.5; }
  75% { opacity: 0.75; }
  100% { opacity: 1; }
}

.element {
  animation: fadeIn 2s ease-in-out;
}"
                      className="min-h-[250px] font-mono"
                      value={animationInput}
                      onChange={(e) => setAnimationInput(e.target.value)}
                    />

                    <div className="pt-2">
                      <h3 className="text-sm font-medium mb-2">Opciones de compresión:</h3>
                      <RadioGroup
                        value={animationMode}
                        onValueChange={setAnimationMode}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="minimize" id="minimize" />
                          <Label htmlFor="minimize">Minimizar (mantener solo keyframes esenciales)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="remove" id="remove" />
                          <Label htmlFor="remove">Eliminar completamente las animaciones</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={clearAnimation}>
                      <Trash className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                    <Button onClick={compressAnimations}>Comprimir Animaciones</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resultado</CardTitle>
                    <CardDescription>
                      CSS con animaciones {animationMode === "minimize" ? "minimizadas" : "eliminadas"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {animationError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{animationError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="relative">
                      <Textarea readOnly className="min-h-[300px] font-mono" value={animationOutput} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button onClick={() => copyToClipboard(animationOutput)} disabled={!animationOutput}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar al Portapapeles
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Pestaña de JavaScript */}
        <TabsContent value="js">
          <Tabs defaultValue="combine" value={activeJsTab} onValueChange={setActiveJsTab}>
            <TabsList className="w-full mb-6">
              <TabsTrigger value="combine" className="flex-1">
                Combinar Scripts
              </TabsTrigger>
              <TabsTrigger value="extract" className="flex-1">
                Extraer Scripts
              </TabsTrigger>
            </TabsList>

            <TabsContent value="combine">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Entrada</CardTitle>
                    <CardDescription>Pega aquí tus múltiples etiquetas &lt;script&gt;</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="<script>
function saludar() {
  console.log('Hola');
}
</script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  console.log('Documento cargado');
});
</script>"
                      className="min-h-[300px] font-mono"
                      value={jsInput}
                      onChange={(e) => setJsInput(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={clearJsCombine}>
                      <Trash className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                    <Button onClick={combineScripts}>Combinar Scripts</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resultado</CardTitle>
                    <CardDescription>Etiqueta script combinada</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jsError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{jsError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="relative">
                      <Textarea readOnly className="min-h-[300px] font-mono" value={jsOutput} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      onClick={() => copyToClipboard(jsOutput)}
                      disabled={!jsOutput}
                      variant={copied ? "outline" : "default"}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar al Portapapeles
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="extract">
              <div className="grid gap-8 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Código HTML</CardTitle>
                    <CardDescription>Pega aquí tu código HTML completo</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="<!DOCTYPE html>
<html>
<head>
  <script>
    function init() {
      console.log('Inicializado');
    }
  </script>
</head>
<body>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      init();
    });
  </script>
</body>
</html>"
                      className="min-h-[300px] font-mono"
                      value={jsExtractInput}
                      onChange={(e) => setJsExtractInput(e.target.value)}
                    />
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={clearJsExtract}>
                      <Trash className="mr-2 h-4 w-4" />
                      Limpiar
                    </Button>
                    <Button onClick={extractScripts}>Extraer Scripts</Button>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Scripts Extraídos</CardTitle>
                    <CardDescription>Etiquetas &lt;script&gt; sin atributos encontradas en el HTML</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {jsExtractError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{jsExtractError}</AlertDescription>
                      </Alert>
                    )}
                    <div className="relative">
                      <Textarea readOnly className="min-h-[300px] font-mono" value={jsExtractOutput} />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button onClick={transferToJsCombine} disabled={!jsExtractOutput} variant="outline">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Transferir a Combinador
                    </Button>
                    <Button onClick={() => copyToClipboard(jsExtractOutput)} disabled={!jsExtractOutput}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
