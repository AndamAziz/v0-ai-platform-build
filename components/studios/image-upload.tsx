"use client"

import React from "react"
import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Loader2, X, Check } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface ImageUploadProps {
  onUploadComplete?: (url: string) => void
}

export function ImageUpload({ onUploadComplete }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [previewFile, setPreviewFile] = useState<{ file: File; preview: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find(f => f.type.startsWith("image/"))
    
    if (imageFile) {
      // Use FileReader for better mobile compatibility
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        if (result) {
          setPreviewFile({
            file: imageFile,
            preview: result
          })
        }
      }
      reader.readAsDataURL(imageFile)
    } else {
      toast.error("Please drop an image file")
    }
  }, [])

  // Compress image for mobile compatibility
  const compressImage = useCallback((file: File, maxWidth = 800, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(img.src)
        
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Canvas not supported"))
          return
        }
        
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (20MB max for original)
      const maxSize = 20 * 1024 * 1024
      if (file.size > maxSize) {
        toast.error("File too large. Maximum size is 20MB")
        return
      }
      
      try {
        // Compress for preview on mobile
        const preview = await compressImage(file, 800, 0.8)
        setPreviewFile({ file, preview })
      } catch {
        toast.error("Failed to process image")
      }
    }
  }, [compressImage])

  const handleUpload = async () => {
    if (!previewFile) return

    setIsUploading(true)
    try {
      const supabase = createClient()
      
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error("Please log in to upload images")
      }

      // Validate file
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"]
      if (!allowedTypes.includes(previewFile.file.type)) {
        throw new Error("Invalid file type. Allowed: JPEG, PNG, WebP, GIF")
      }
      
      const maxSize = 10 * 1024 * 1024
      if (previewFile.file.size > maxSize) {
        throw new Error("File too large. Maximum size is 10MB")
      }

      // Generate unique filename
      const fileExt = previewFile.file.name.split(".").pop() || "png"
      const fileName = `upload-${user.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

      // Upload directly to Supabase Storage from client
      const { error: uploadError } = await supabase.storage
        .from("generations")
        .upload(fileName, previewFile.file, {
          contentType: previewFile.file.type,
          upsert: false,
        })

      if (uploadError) {
        throw new Error(`Storage error: ${uploadError.message}`)
      }

      // Get public URL
      const { data: publicUrl } = supabase.storage
        .from("generations")
        .getPublicUrl(fileName)

      // Save to generations table
      const { error: dbError } = await supabase
        .from("generations")
        .insert({
          user_id: user.id,
          type: "image",
          provider: "upload",
          prompt: previewFile.file.name,
          status: "completed",
          result_url: publicUrl.publicUrl,
          credits_used: 0,
          metadata: {
            original_name: previewFile.file.name,
            file_size: previewFile.file.size,
            file_type: previewFile.file.type,
            uploaded: true,
          },
          completed_at: new Date().toISOString(),
        })

      if (dbError) {
        console.error("Database error:", dbError)
      }

      setUploadedImages(prev => [publicUrl.publicUrl, ...prev])
      toast.success("Image uploaded successfully!")
      
      if (onUploadComplete) {
        onUploadComplete(publicUrl.publicUrl)
      }
      
      // Clear preview
      URL.revokeObjectURL(previewFile.preview)
      setPreviewFile(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClearPreview = () => {
    if (previewFile) {
      // Only revoke if it's an object URL (not base64)
      if (previewFile.preview && !previewFile.preview.startsWith("data:")) {
        URL.revokeObjectURL(previewFile.preview)
      }
      setPreviewFile(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex flex-col items-center gap-3">
            <div className={`rounded-full p-3 ${isDragging ? "bg-primary/10" : "bg-muted"}`}>
              <Upload className={`h-6 w-6 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-medium">
                {isDragging ? "Drop your image here" : "Drag & drop or click to upload"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Supports JPEG, PNG, WebP, GIF (max 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Preview */}
        {previewFile && (
          <div className="relative rounded-lg border bg-muted/30 p-4">
            <button
              onClick={handleClearPreview}
              className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-white hover:bg-destructive/90"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start gap-4">
              <img
                src={previewFile.preview || "/placeholder.svg"}
                alt="Preview"
                className="h-24 w-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-medium truncate">{previewFile.file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(previewFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading}
                  className="mt-3"
                  size="sm"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Uploaded Images */}
        {uploadedImages.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Recently Uploaded</p>
            <div className="grid grid-cols-4 gap-2">
              {uploadedImages.slice(0, 8).map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                  <img
                    src={url || "/placeholder.svg"}
                    alt={`Uploaded ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
