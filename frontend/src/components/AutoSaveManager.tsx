import React from 'react'
import { useAutoSave } from '../hooks/useAutoSave'

// 自動保存を管理する空のコンポーネント
const AutoSaveManager: React.FC = () => {
  useAutoSave()
  return null
}

export default AutoSaveManager
