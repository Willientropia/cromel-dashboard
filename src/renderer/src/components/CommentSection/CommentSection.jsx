import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

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
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CommentSection({ taskId, comments = [], onCommentAdded }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [comments.length])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await window.api.addComment(taskId, text.trim())
      if (!res.success) {
        setError(res.error)
      } else {
        setText('')
        onCommentAdded && onCommentAdded(res.data)
      }
    } catch {
      setError('Erro ao enviar comentário.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e)
    }
  }

  return (
    <div className="comments-section">
      <h4>
        <span>💬</span>
        Comentários {comments.length > 0 && `(${comments.length})`}
      </h4>

      <div className="comments-list" ref={listRef}>
        {comments.length === 0 ? (
          <p className="no-comments">Nenhum comentário ainda. Seja o primeiro!</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="comment-item">
              <div className="comment-avatar">{getInitials(c.username)}</div>
              <div className="comment-body">
                <div className="comment-meta">
                  <span className="comment-username">{c.username}</span>
                  <span className="comment-time">{formatDate(c.createdAt)}</span>
                </div>
                <p className="comment-text">{c.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="comment-input-row">
          <div className="comment-avatar" style={{ alignSelf: 'flex-end', marginBottom: '2px' }}>
            {getInitials(user?.username)}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicione um comentário... (Ctrl+Enter para enviar)"
            disabled={loading}
          />
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            disabled={loading || !text.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            {loading ? '...' : '↑'}
          </button>
        </div>
        {error && <p className="form-error" style={{ marginTop: 6 }}>{error}</p>}
      </form>
    </div>
  )
}
