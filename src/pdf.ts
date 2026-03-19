import { PDFDocument } from 'pdf-lib'

export async function mergePdfs(inputPdfPaths: string[], outputPath: string): Promise<void> {
  if (inputPdfPaths.length === 0) {
    throw new Error('no PDFs provided')
  }
  const merged = await PDFDocument.create()
  for (const pdfPath of inputPdfPaths) {
    const pdfBytes = await Bun.file(pdfPath).arrayBuffer()
    const pdfDoc = await PDFDocument.load(pdfBytes)
    const copiedPages = await merged.copyPages(pdfDoc, pdfDoc.getPageIndices())
    copiedPages.forEach((page) => merged.addPage(page))
  }
  const mergedBytes = await merged.save()
  await Bun.write(outputPath, mergedBytes)
}
