import { mediaUrl } from '../hooks'

interface MediaSlotProps {
  file: string 
  ratio: string 
  alt: string 
  placeholder: string 
}


export default function MediaSlot({ file, ratio, alt, placeholder }: MediaSlotProps) {
  const style = { aspectRatio: ratio }
  if (!file) {
    return (
      <div className="media-slot is-empty" style={style} role="img" aria-label={`Placeholder: ${placeholder}`}>
        <span className="media-text">{placeholder}</span>
        <span className="media-hint" aria-hidden="true">awaiting file · public/media/</span>
      </div>
    )
  }
  return (
    <div className="media-slot" style={style}>
      <img src={mediaUrl(file)} alt={alt} loading="lazy" decoding="async" />
    </div>
  )
}
