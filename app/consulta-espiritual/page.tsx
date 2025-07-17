"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ConsultationForm {
  name: string
  birthdate: string
  question: string
}

export default function ConsultaEspiritualPage() {
  const [apiError, setApiError] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const {
    control,
    handleSubmit,
    reset,
  } = useForm<ConsultationForm>({
    defaultValues: {
      name: "",
      birthdate: "",
      question: "",
    },
  })

  const onSubmit = async (values: ConsultationForm) => {
    setApiError(null)
    setResult(null)
    try {
      const response = await fetch("/api/consulta-espiritual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(text || "Ocurrió un error al procesar tu solicitud.")
      }

      const data = await response.json()
      setResult(data?.answer ?? "")
      reset()
    } catch (err) {
      console.error(err)
      setApiError(err instanceof Error ? err.message : "Error desconocido")
    }
  }

  return (
    <main className="container mx-auto max-w-xl py-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4">Consulta Espiritual</h1>
      <Form>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={control}
            name="name"
            rules={{ required: "El nombre es obligatorio" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre</FormLabel>
                <FormControl>
                  <Input placeholder="Ingresa tu nombre" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="birthdate"
            rules={{ required: "La fecha de nacimiento es obligatoria" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fecha de Nacimiento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="question"
            rules={{
              required: "La pregunta es obligatoria",
              minLength: {
                value: 10,
                message: "La pregunta debe tener al menos 10 caracteres",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pregunta</FormLabel>
                <FormControl>
                  <Textarea placeholder="Escribe tu pregunta" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            Enviar Consulta
          </Button>
        </form>
      </Form>

      {apiError && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert>
          <AlertTitle>Respuesta</AlertTitle>
          <AlertDescription>{result}</AlertDescription>
        </Alert>
      )}
    </main>
  )
}

