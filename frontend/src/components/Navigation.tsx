import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Database, LayoutDashboard, Workflow, BarChart3 } from 'lucide-react'

const Navigation: React.FC = () => {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navItems = [
    {
      path: '/',
      label: 'ホーム',
      icon: LayoutDashboard
    },
    {
      path: '/dashboard',
      label: 'ダッシュボード',
      icon: BarChart3
    },
    {
      path: '/database',
      label: 'データベース',
      icon: Database
    },
    {
      path: '/pipeline',
      label: 'パイプライン',
      icon: Workflow
    }
  ]

  return (
    <nav className="border-b bg-card">
      <div className="w-full px-2 min-w-[700px]">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <img
              src="/iconRaccoon.png"
              alt="AgentRaccoon"
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-lg font-bold text-foreground">AgentRaccoon</h1>
          </div>
          <div className="flex gap-1">
            {navItems.map(item => {
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive(item.path)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation