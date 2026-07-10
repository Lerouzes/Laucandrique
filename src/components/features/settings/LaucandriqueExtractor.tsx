// src/components/features/settings/LaucandriqueExtractor.tsx
"use client"

import { useState, useRef, DragEvent, ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  FolderSync, 
  Loader2, 
  AlertCircle,
  FileText,
  Info
} from "lucide-react"
import * as XLSX from "xlsx"
import JSZip from "jszip"

interface LaucandriqueExtractorProps {
  onSendToAnalyzer: (files: File[]) => void
}

const FINAL_HEADERS = ["Lot", "Type", "Date", "Unité", "Destinataire", "Objet", "Ajouté par", "Ajouté quand", "Notes"]

const getSentReceivedCounts = (rows: any[]) => {
  let sent = 0
  let received = 0
  rows.forEach(row => {
    let type = (row["Type"] || "").toLowerCase().trim()
    
    // Handle potential mojibake/UTF-8 double encoding issues
    type = type.replace(/expã©diã©/g, "expedie")
               .replace(/reã§u/g, "recu")
               .replace(/expã©/g, "expe")
               .replace(/reã§/g, "rec")
               .replace(/expÃ©diÃ©/g, "expedie")
               .replace(/reÃ§u/g, "recu")
               .replace(/expÃ©/g, "expe")
               .replace(/reÃ§/g, "rec")
         
    // Normalize accents
    type = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    if (type.includes("expedi") || type.includes("sent") || type.includes("envoi")) {
      sent++
    } else if (type.includes("recu") || type.includes("received")) {
      received++
    }
  })
  return { sent, received }
}

export function LaucandriqueExtractor({ onSendToAnalyzer }: LaucandriqueExtractorProps) {
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("csv")
  const [isParsing, setIsParsing] = useState(false)
  const [isZipping, setIsZipping] = useState(false)
  const [dataByLot, setDataByLot] = useState<Record<string, any[]>>({})
  const [totalRowsParsed, setTotalRowsParsed] = useState(0)
  const [fileName, setFileName] = useState<string>("")
  const [dragActive, setDragActive] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const processFile = (file: File) => {
    setIsParsing(true)
    setFileName(file.name)
    setDataByLot({})
    setTotalRowsParsed(0)

    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        let rawRows: any[][] = []
        if (fileExtension === "xlsx" || fileExtension === "xls") {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: "array", raw: true })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]
          rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][]
        } else {
          const text = e.target?.result as string
          rawRows = text.split("\n").map(line => {
            // Basic CSV splitter that handles commas
            // (Note: simple splitting is fine for raw lot files as a fallback, 
            // but we split while respecting quotes where possible)
            return parseCSVLine(line)
          })
        }
        cleanAndStructureData(rawRows)
      } catch (err: any) {
        console.error(err)
        toast.error("Erreur de lecture du fichier : " + err.message)
        setIsParsing(false)
      }
    }

    if (fileExtension === "xlsx" || fileExtension === "xls") {
      reader.readAsArrayBuffer(file)
    } else {
      reader.readAsText(file, "UTF-8")
    }
  }

  // Simple CSV line parser respecting quotes
  const parseCSVLine = (text: string): string[] => {
    const result: string[] = []
    let curVal = ""
    let inQuotes = false
    
    for (let i = 0; i < text.length; i++) {
      const c = text[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if (c === ',' && !inQuotes) {
        result.push(curVal.trim())
        curVal = ""
      } else {
        curVal += c
      }
    }
    result.push(curVal.trim())
    return result
  }

  const standardizeString = (str: any): string => {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")
      .trim()
  }

  const cleanAndStructureData = (rawRows: any[][]) => {
    const cleanedData: Record<string, any[]> = {}
    let headerIndex = -1

    // Detect header row by checking for key columns
    for (let i = 0; i < rawRows.length; i++) {
      if (rawRows[i] && rawRows[i].length > 0) {
        let matchCount = 0
        for (let j = 0; j < rawRows[i].length; j++) {
          const cellStr = standardizeString(rawRows[i][j])
          if (
            cellStr.includes("syndicat") || 
            cellStr.includes("copropriete") || 
            cellStr.includes("client") || 
            cellStr.includes("immeuble") || 
            cellStr.includes("lot")
          ) {
            matchCount++
          } else if (
            cellStr.includes("type") || 
            cellStr.includes("communication") || 
            cellStr.includes("canal") || 
            cellStr.includes("mode") ||
            cellStr.includes("methode")
          ) {
            matchCount++
          } else if (cellStr.includes("date")) {
            matchCount++
          } else if (
            cellStr.includes("objet") || 
            cellStr.includes("sujet") || 
            cellStr.includes("titre") || 
            cellStr.includes("description")
          ) {
            matchCount++
          } else if (
            cellStr.includes("ajoute") || 
            cellStr.includes("auteur") || 
            cellStr.includes("user") || 
            cellStr.includes("utilisateur")
          ) {
            matchCount++
          }
        }
        if (matchCount >= 3) {
          headerIndex = i
          break
        }
      }
    }

    // Fallback: search for a single syndicate or lot header cell
    if (headerIndex === -1) {
      for (let i = 0; i < rawRows.length; i++) {
        if (rawRows[i] && rawRows[i].length > 0) {
          for (let j = 0; j < rawRows[i].length; j++) {
            const cellStr = standardizeString(rawRows[i][j])
            if (
              cellStr.includes("syndicat") || 
              cellStr.includes("copropriete") || 
              cellStr.includes("immeuble") || 
              cellStr.includes("lot") ||
              cellStr.includes("client")
            ) {
              headerIndex = i
              break
            }
          }
        }
        if (headerIndex !== -1) break
      }
    }

    if (headerIndex === -1) {
      headerIndex = 2 // Fallback default
    }

    if (!rawRows[headerIndex] || rawRows[headerIndex].length === 0) {
      toast.error("Format incorrect : Ligne d'en-tête introuvable.")
      setIsParsing(false)
      return
    }

    const fileHeaders = rawRows[headerIndex].map(h => standardizeString(h))

    const indexMap = {
      syndicat: fileHeaders.findIndex(h => h.includes("syndicat") || h.includes("lot") || h.includes("copropriete") || h.includes("client") || h.includes("immeuble")),
      type: fileHeaders.findIndex(h => h.includes("type") || h.includes("communication") || h.includes("canal") || h.includes("mode") || h.includes("methode")),
      date: fileHeaders.findIndex(h => h.includes("date")),
      unite: fileHeaders.findIndex(h => h.includes("unite") || h.includes("app") || h.includes("suite")),
      destinataire: fileHeaders.findIndex(h => h.includes("destinataire") || h.includes("dest") || h.includes("envoye") || h.includes("destin")),
      objet: fileHeaders.findIndex(h => h.includes("objet") || h.includes("sujet") || h.includes("titre") || h.includes("desc")),
      ajoutepar: fileHeaders.findIndex(h => h.includes("ajoutepar") || h.includes("ajoutépar") || h.includes("auteur") || h.includes("user") || h.includes("utilisateur")),
      ajoutequand: fileHeaders.findIndex(h => h.includes("ajoutequand") || h.includes("ajoutéquand") || h.includes("quand") || h.includes("heure") || h.includes("cree")),
      notes: fileHeaders.findIndex(h => h.includes("note") || h.includes("comment") || h.includes("remarque"))
    }

    const syndIdx = indexMap.syndicat !== -1 ? indexMap.syndicat : 0
    let parsedCount = 0

    for (let i = headerIndex + 1; i < rawRows.length; i++) {
      const row = rawRows[i]
      if (!row || row.length === 0 || String(row[syndIdx] || "").trim() === "") continue

      const syndicateFullStr = String(row[syndIdx]).trim()
      
      // Accept any starting letter (R or S) followed by digits
      const codeMatch = syndicateFullStr.match(/^([A-Z]\d+)/i)
      if (!codeMatch) continue 
      
      const syndicateCode = codeMatch[1].toUpperCase()

      const getVal = (key: keyof typeof indexMap) => {
        const idx = indexMap[key]
        return (idx !== undefined && idx !== -1 && row[idx] !== undefined) ? String(row[idx]).trim() : ""
      }

      const cleanedObject = {
        "Lot": syndicateCode,
        "Type": getVal("type"),
        "Date": getVal("date"),
        "Unité": getVal("unite"),
        "Destinataire": getVal("destinataire"),
        "Objet": getVal("objet"),
        "Ajouté par": getVal("ajoutepar"),
        "Ajouté quand": getVal("ajoutequand"),
        "Notes": getVal("notes")
      }

      if (!cleanedData[syndicateCode]) {
        cleanedData[syndicateCode] = []
      }
      cleanedData[syndicateCode].push(cleanedObject)
      parsedCount++
    }

    setDataByLot(cleanedData)
    setTotalRowsParsed(parsedCount)
    setIsParsing(false)

    const lotsCount = Object.keys(cleanedData).length
    if (lotsCount > 0) {
      toast.success(`Lecture complétée : ${parsedCount} lignes extraites pour ${lotsCount} syndicats distincts.`)
    } else {
      toast.warning("Aucun code syndicat valide (ex: R106, S205) n'a été identifié dans le fichier.")
    }
  }

  const downloadSingleLot = (lot: string) => {
    const dataset = dataByLot[lot]
    if (!dataset || dataset.length === 0) return

    if (exportFormat === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(dataset, { header: FINAL_HEADERS })
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, lot)
      XLSX.writeFile(workbook, `${lot}_Communications.xlsx`)
    } else {
      const csvRows = [FINAL_HEADERS.join(",")]
      dataset.forEach((item: any) => {
        const values = FINAL_HEADERS.map(h => `"${(item[h] || '').replace(/"/g, '""')}"`)
        csvRows.push(values.join(","))
      })
      const blob = new Blob(["\uFEFF" + csvRows.join("\r\n")], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${lot}_Communications.csv`
      link.click()
    }
  }

  const downloadZip = async () => {
    setIsZipping(true)
    try {
      const zip = new JSZip()
      Object.keys(dataByLot).forEach(lot => {
        const dataset = dataByLot[lot]
        if (exportFormat === "xlsx") {
          const worksheet = XLSX.utils.json_to_sheet(dataset, { header: FINAL_HEADERS })
          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, worksheet, lot)
          const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
          zip.file(`${lot}_Communications.xlsx`, wbout)
        } else {
          const csvRows = [FINAL_HEADERS.join(",")]
          dataset.forEach((item: any) => {
            const values = FINAL_HEADERS.map(h => `"${(item[h] || '').replace(/"/g, '""')}"`)
            csvRows.push(values.join(","))
          })
          const csvContent = "\uFEFF" + csvRows.join("\r\n")
          zip.file(`${lot}_Communications.csv`, csvContent)
        }
      })

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(zipBlob)
      link.download = `Ventilation_Lots_${new Date().toISOString().slice(0, 10)}.zip`
      link.click()
      toast.success("Fichier ZIP créé et téléchargé avec succès !")
    } catch (err: any) {
      console.error(err)
      toast.error("Erreur lors de la création du ZIP : " + err.message)
    } finally {
      setIsZipping(false)
    }
  }

  const handleSendToAnalyzer = () => {
    const filesList: File[] = []
    Object.keys(dataByLot).forEach(lot => {
      const dataset = dataByLot[lot]
      const csvRows = [FINAL_HEADERS.join(",")]
      dataset.forEach((item: any) => {
        const values = FINAL_HEADERS.map(h => `"${(item[h] || '').replace(/"/g, '""')}"`)
        csvRows.push(values.join(","))
      })
      const csvContent = "\uFEFF" + csvRows.join("\r\n")
      
      // Create a File object containing the UTF-8 CSV representation
      const file = new File([csvContent], `${lot}_Communications.csv`, { type: "text/csv" })
      filesList.push(file)
    })

    if (filesList.length > 0) {
      onSendToAnalyzer(filesList)
    } else {
      toast.error("Aucun fichier à envoyer.")
    }
  }

  const lots = Object.keys(dataByLot).sort()

  return (
    <Card className="bg-zinc-900 border-zinc-800 shadow-xl rounded-2xl overflow-hidden text-xs">
      <CardHeader className="border-b border-zinc-850 bg-zinc-950/30 p-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600/15 border border-emerald-500/20 text-emerald-400 rounded-xl">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-zinc-100 uppercase tracking-wider">Extracteur Laucandrique V7</CardTitle>
            <CardDescription className="text-xxs text-zinc-500">
              Prise en charge universelle des codes syndicats (Rxxx & Sxxx). Déposez votre extraction globale pour la ventiler par lot.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Settings Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-950/60 p-4 border border-zinc-850 rounded-xl">
          <div>
            <span className="block text-[10px] uppercase tracking-wider font-extrabold text-zinc-550 text-zinc-500 mb-1.5">Format d'exportation :</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer font-semibold select-none">
                <input 
                  type="radio" 
                  name="export-format" 
                  value="xlsx" 
                  checked={exportFormat === "xlsx"} 
                  onChange={() => setExportFormat("xlsx")}
                  className="h-3.5 w-3.5 text-indigo-600 focus:ring-0 accent-indigo-600 cursor-pointer bg-zinc-950 border-zinc-800"
                />
                <span>Fichiers Excel (.xlsx)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer font-semibold select-none">
                <input 
                  type="radio" 
                  name="export-format" 
                  value="csv" 
                  checked={exportFormat === "csv"} 
                  onChange={() => setExportFormat("csv")}
                  className="h-3.5 w-3.5 text-indigo-600 focus:ring-0 accent-indigo-600 cursor-pointer bg-zinc-950 border-zinc-800"
                />
                <span>Fichiers CSV (.csv)</span>
              </label>
            </div>
          </div>
          
          {lots.length > 0 && (
            <div className="text-[10px] text-zinc-500 font-bold bg-zinc-950 border border-zinc-850 px-3 py-2 rounded-lg">
              Lot actif : <span className="text-zinc-300 font-mono">{fileName}</span>
            </div>
          )}
        </div>

        {/* Drag and Drop Zone */}
        <div 
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
            dragActive 
              ? "border-emerald-500 bg-emerald-950/10" 
              : "border-zinc-800 bg-zinc-950/20 hover:bg-zinc-950/45 hover:border-zinc-700"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls, .csv, .txt" 
            className="hidden"
          />
          {isParsing ? (
            <div className="space-y-3">
              <Loader2 className="h-8 w-8 text-emerald-450 text-emerald-400 animate-spin mx-auto" />
              <span className="text-xs font-semibold text-zinc-300 block">Nettoyage et structuration des lots...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="mx-auto h-8 w-8 text-zinc-500 mb-1" />
              <p className="text-xs text-zinc-300 font-bold">Glissez-déposez le fichier d'extraction global Laucandrique ici</p>
              <p className="text-[10px] text-zinc-550 text-zinc-500 font-medium">Prend en charge les formats Excel (.xlsx, .xls) et CSV</p>
              <Button 
                type="button" 
                size="sm" 
                className="mt-3 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 border border-zinc-700/60 font-bold rounded-lg cursor-pointer"
              >
                Parcourir les fichiers
              </Button>
            </div>
          )}
        </div>

        {/* Results view */}
        {lots.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Summary info box */}
            <div className="bg-indigo-950/30 border border-indigo-850/45 p-4 rounded-xl flex items-start gap-3 text-indigo-300">
              <Info className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block text-[10px] uppercase tracking-wider">Traitement complété</span>
                <p className="text-[10px] text-indigo-250 leading-relaxed font-semibold">
                  Les lignes d'introduction ont été automatiquement ignorées. <strong>{totalRowsParsed}</strong> lignes extraites sur <strong>{lots.length}</strong> syndicats distincts détectés dans le fichier.
                </p>
              </div>
            </div>

            {/* Split Table */}
            <div className="border border-zinc-850 rounded-xl overflow-hidden bg-zinc-950/40">
              <table className="min-w-full divide-y divide-zinc-900 text-left">
                <thead className="bg-zinc-950/80 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-bold">Syndicat (Lot)</th>
                    <th className="px-4 py-3 font-bold">Volume de lignes</th>
                    <th className="px-4 py-3 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300 font-semibold bg-zinc-900/10">
                  {lots.map(lot => {
                    const rows = dataByLot[lot]
                    const count = rows.length
                    const { sent, received } = getSentReceivedCounts(rows)
                    return (
                      <tr key={lot} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="px-4 py-2.5 font-bold font-mono text-zinc-200 text-xs">{lot}</td>
                        <td className="px-4 py-2.5 text-zinc-500 font-semibold text-xxs">
                          {count} lignes
                          <span className="ml-2 text-zinc-400 font-normal">
                            ({sent} {sent > 1 ? 'expédiés' : 'expédié'} / {received} {received > 1 ? 'reçus' : 'reçu'})
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Button 
                            onClick={() => downloadSingleLot(lot)}
                            type="button" 
                            size="sm" 
                            variant="outline"
                            className="bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] h-7 px-2.5 rounded-md cursor-pointer"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Télécharger
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Double actions buttons block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-850">
              <Button 
                onClick={downloadZip} 
                disabled={isZipping}
                type="button" 
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-850 hover:text-zinc-100 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-xs"
              >
                {isZipping ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                    <span>Création du ZIP...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-zinc-450" />
                    <span>Tout télécharger d'un coup (ZIP)</span>
                  </>
                )}
              </Button>

              <Button 
                onClick={handleSendToAnalyzer}
                type="button" 
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-emerald-900/20 transition-all cursor-pointer text-xs"
              >
                <FolderSync className="h-4 w-4" />
                <span>Envoyer à l'analyseur de communications</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
