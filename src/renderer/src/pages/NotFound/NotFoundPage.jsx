import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="code">404</div>
      <h2>Página não encontrada</h2>
      <p>A página que você está procurando não existe ou foi movida.</p>
      <Link to="/dashboard" className="btn btn-primary">
        Voltar ao Dashboard
      </Link>
    </div>
  )
}
