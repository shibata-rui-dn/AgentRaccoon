import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Workflow, BarChart3, ArrowRight, Upload, GitBranch, LineChart } from 'lucide-react'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()

  const features = [
    {
      icon: Database,
      title: 'データ登録',
      description: 'Excel、CSVファイルをアップロードしてデータベースを作成',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      path: '/database'
    },
    {
      icon: Workflow,
      title: 'パイプライン構築',
      description: 'ビジュアルエディターでデータ変換・集計フローを作成',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      path: '/pipeline'
    },
    {
      icon: BarChart3,
      title: 'データ可視化',
      description: 'チャート・グラフでデータをインタラクティブに表示',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      path: '/dashboard'
    }
  ]

  const steps = [
    {
      icon: Upload,
      title: 'データをアップロード',
      description: 'データベースタブでExcelやCSVファイルをアップロード',
      path: '/database'
    },
    {
      icon: GitBranch,
      title: '変換フローを構築',
      description: 'パイプラインタブでデータ変換・集計フローを構築',
      path: '/pipeline'
    },
    {
      icon: LineChart,
      title: '結果を可視化',
      description: 'ダッシュボードでチャートやグラフで結果を確認',
      path: '/dashboard'
    }
  ]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Hero Section */}
          <div className="text-center space-y-3 pb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <img
                src="/iconraccoon.png"
                alt="AgentRaccoon"
                className="h-8 w-8 object-contain"
              />
              <h1 className="text-3xl font-bold text-foreground">AgentRaccoon</h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              データパイプラインプラットフォームへようこそ
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              データをアップロードして、変換・可視化・AI分析を簡単に行えます
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Card
                  key={index}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                  onClick={() => navigate(feature.path)}
                >
                  <CardHeader className="pb-3">
                    <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-5 w-5 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between group-hover:bg-accent"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(feature.path)
                      }}
                    >
                      開始する
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Quick Start Guide */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-xl">クイックスタートガイド</CardTitle>
              <CardDescription>
                3つの簡単なステップでデータ分析を始めましょう
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {steps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <div
                      key={index}
                      className="relative flex flex-col items-center text-center p-4 rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                      onClick={() => navigate(step.path)}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base mb-3 group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <Icon className="h-6 w-6 text-primary mb-2" />
                      <h3 className="font-semibold text-base mb-1">{step.title}</h3>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      {index < steps.length - 1 && (
                        <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Additional Resources */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">主な機能</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs">Excel、CSVファイルの簡単インポート</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs">ドラッグ&ドロップでパイプライン構築</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs">リアルタイムデータ変換・集計</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                    <span className="text-xs">インタラクティブなチャート・グラフ</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">サポートされるデータ形式</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
                    <Database className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-xs">Excel (.xlsx, .xls)</p>
                      <p className="text-[10px] text-muted-foreground">Excelファイル形式</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50">
                    <Database className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium text-xs">CSV (.csv)</p>
                      <p className="text-[10px] text-muted-foreground">カンマ区切りテキスト形式</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard