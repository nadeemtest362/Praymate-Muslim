export async function burnCaptionOnImage(
  imageUrl: string,
  text: string,
  style: any = {}
): Promise<string> {
  // For now, just return the original image URL
  // The text will be shown as an overlay in the UI
  console.log('Caption burning requested for:', { imageUrl, text, style })
  return imageUrl
}

// Batch process multiple images with captions
export async function burnCaptionsOnSlideshow(
  slides: Array<{ imageUrl: string; text: string }>,
  style?: Partial<CaptionStyle>
): Promise<string[]> {
  const results = await Promise.all(
    slides.map((slide) => burnCaptionOnImage(slide.imageUrl, slide.text, style))
  )

  return results
}
