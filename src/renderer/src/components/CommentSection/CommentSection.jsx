import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../api'
import {
  IconComment, IconSend, IconCamera, IconClose,
  IconDownload, IconExpand, IconChevronLeft, IconChevronRight, IconImage
} from '../Icons/Icons'

function getInitials(username) {
  if (!username) return '?'
  return username
    .split(/[._-]/)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

function getCommentImages(comment) {
  if (comment.imageUrls?.length) return comment.imageUrls
  if (comment.imageUrl) return [comment.imageUrl]
  return []
}

async function downloadImage(url, filename) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename || 'foto.jpg'
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    window.open(url, '_blank')
  }
}

async function downloadAll(urls) {
  for (let i = 0; i < urls.length; i++) {
    await downloadImage(urls[i], `foto-${i + 1}.jpg`)
    if (i < urls.length - 1) await new Promise(r => setTimeout(r, 400))
  }
}

function Lightbox({ images, index: initialIndex, onClose }) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-content" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose} title="Fechar">
          <IconClose size={20} />
        </button>

        <div className="lightbox-img-wrap">
          {images.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-prev"
              onClick={() => setIndex(i => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              <IconChevronLeft size={20} />
            </button>
          )}
          <img src={images[index]} alt={`foto ${index + 1}`} className="lightbox-img" />
          {images.length > 1 && (
            <button
              className="lightbox-nav lightbox-nav-next"
              onClick={() => setIndex(i => Math.min(images.length - 1, i + 1))}
              disabled={index === images.length - 1}
            >
              <IconChevronRight size={20} />
            </button>
          )}
        </div>

        <div className="lightbox-footer">
          {images.length > 1 && (
            <span className="lightbox-counter">{index + 1} / {images.length}</span>
          )}
          <button
            className="lightbox-action-btn"
            onClick={() => downloadImage(images[index], `foto-${index + 1}.jpg`)}
            title="Baixar esta foto"
          >
            <IconDownload size={16} /> Baixar
          </button>
          {images.length > 1 && (
            <button
              className="lightbox-action-btn"
              onClick={() => downloadAll(images)}
              title="Baixar todas as fotos"
            >
              <IconDownload size={16} /> Baixar todas ({images.length})
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Desktop = Electron (window.api existe); Mobile = Capacitor
const isDesktop = typeof window !== 'undefined' && !!window.api

export default function CommentSection({ taskId, comments = [], users = [], onCommentAdded }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cameraMenu, setCameraMenu] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { images, index }
  const listRef = useRef(null)
  const galleryInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const cameraMenuRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [comments.length])

  useEffect(() => {
    return () => photoPreviews.forEach(p => URL.revokeObjectURL(p.url))
  }, [photoPreviews])

  // Close camera menu on outside click
  useEffect(() => {
    if (!cameraMenu) return
    function handler(e) {
      if (cameraMenuRef.current && !cameraMenuRef.current.contains(e.target)) {
        setCameraMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [cameraMenu])

  function addFiles(files) {
    if (!files?.length) return
    const newPhotos = [...photos]
    const newPreviews = [...photoPreviews]
    for (const file of files) {
      newPhotos.push(file)
      newPreviews.push({ url: URL.createObjectURL(file), name: file.name })
    }
    setPhotos(newPhotos)
    setPhotoPreviews(newPreviews)
  }

  function removePhoto(i) {
    URL.revokeObjectURL(photoPreviews[i].url)
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
    setPhotoPreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() && !photos.length) return
    setLoading(true)
    setError('')
    try {
      const imageUrls = []
      for (const photo of photos) {
        const uploadRes = await api.uploadCommentPhoto(photo)
        if (!uploadRes.success) {
          setError(uploadRes.error || 'Erro ao enviar foto.')
          setLoading(false)
          return
        }
        imageUrls.push(uploadRes.data)
      }

      const res = await api.addComment(taskId, text.trim(), imageUrls)
      if (!res.success) {
        setError(res.error)
      } else {
        setText('')
        photoPreviews.forEach(p => URL.revokeObjectURL(p.url))
        setPhotos([])
        setPhotoPreviews([])
        onCommentAdded && onCommentAdded(res.data)
      }
    } catch {
      setError('Erro ao enviar comentario.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
  }

  return (
    <div className="comments-section">
      {lightbox && (
        <Lightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      <h4>
        <IconComment size={15} />
        Comentarios {comments.length > 0 && `(${comments.length})`}
      </h4>

      <div className="comments-list" ref={listRef}>
        {comments.length === 0 ? (
          <p className="no-comments">Nenhum comentario ainda. Seja o primeiro!</p>
        ) : (
          comments.map((c) => {
            const commentUser = users.find((u) => u.id === c.userId)
            const images = getCommentImages(c)
            return (
              <div key={c.id} className="comment-item">
                {commentUser?.photo ? (
                  <img src={commentUser.photo} alt={c.username} className="comment-avatar-img" />
                ) : (
                  <div className="comment-avatar">{getInitials(c.username)}</div>
                )}
                <div className="comment-body">
                  <div className="comment-meta">
                    <span className="comment-username">{c.username}</span>
                    <span className="comment-time">{formatDate(c.createdAt)}</span>
                  </div>
                  {c.text && <p className="comment-text">{c.text}</p>}
                  {images.length > 0 && (
                    <div className="comment-images">
                      <div className="comment-images-grid">
                        {images.map((url, i) => (
                          <button
                            key={i}
                            className="comment-image-thumb"
                            onClick={() => setLightbox({ images, index: i })}
                            title="Ver foto"
                          >
                            <img src={url} alt={`foto ${i + 1}`} />
                            <span className="comment-image-expand"><IconExpand size={14} /></span>
                          </button>
                        ))}
                      </div>
                      {images.length > 1 && (
                        <button
                          className="comment-download-all"
                          onClick={() => downloadAll(images)}
                          title="Baixar todas as fotos"
                        >
                          <IconDownload size={13} /> Baixar todas ({images.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {photoPreviews.length > 0 && (
        <div className="comment-photo-previews">
          {photoPreviews.map((p, i) => (
            <div key={i} className="comment-photo-preview">
              <img src={p.url} alt={p.name} />
              <button
                type="button"
                className="comment-photo-remove"
                onClick={() => removePhoto(i)}
                title="Remover foto"
              >
                <IconClose size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="comment-input-row">
          {user?.photo ? (
            <img src={user.photo} alt={user.username} className="comment-avatar-img" style={{ alignSelf: 'flex-end', marginBottom: '2px' }} />
          ) : (
            <div className="comment-avatar" style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
              {getInitials(user?.username)}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicione um comentario... (Ctrl+Enter para enviar)"
            disabled={loading}
          />

          {/* Hidden file inputs */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          />
          {!isDesktop && (
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
            />
          )}

          {/* Desktop: abre explorador direto. Mobile: menu câmera/galeria */}
          {isDesktop ? (
            <button
              type="button"
              className={`btn btn-ghost btn-sm${photos.length ? ' active' : ''}`}
              onClick={() => galleryInputRef.current?.click()}
              disabled={loading}
              title="Anexar fotos"
              style={{ alignSelf: 'flex-end', position: 'relative' }}
            >
              <IconCamera size={16} />
              {photos.length > 0 && <span className="camera-badge">{photos.length}</span>}
            </button>
          ) : (
            <div className="camera-menu-wrapper" ref={cameraMenuRef} style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className={`btn btn-ghost btn-sm${photos.length ? ' active' : ''}`}
                onClick={() => setCameraMenu(m => !m)}
                disabled={loading}
                title="Anexar foto"
              >
                <IconCamera size={16} />
                {photos.length > 0 && <span className="camera-badge">{photos.length}</span>}
              </button>
              {cameraMenu && (
                <div className="camera-menu">
                  <button
                    type="button"
                    onClick={() => { cameraInputRef.current.click(); setCameraMenu(false) }}
                  >
                    <IconCamera size={15} /> Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => { galleryInputRef.current.click(); setCameraMenu(false) }}
                  >
                    <IconImage size={15} /> Galeria
                  </button>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || (!text.trim() && !photos.length)}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? '...' : <IconSend size={14} />}
          </button>
        </div>
        {error && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}
      </form>
    </div>
  )
}
