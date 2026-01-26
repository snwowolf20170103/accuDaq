/**
 * GitPanel - Git Version Control Integration Panel
 * 
 * Features:
 * - Repository initialization
 * - Commit, push, pull operations
 * - Branch management
 * - Version history (commit log)
 * - File status viewer
 */

import { useState, useEffect, useCallback } from 'react'
import './GitPanel.css'

interface GitStatus {
    initialized: boolean
    branch: string
    ahead: number
    behind: number
    staged: string[]
    modified: string[]
    untracked: string[]
    hasRemote: boolean
    remoteName: string
    remoteUrl: string
}

interface GitCommit {
    hash: string
    shortHash: string
    author: string
    date: string
    message: string
    branch?: string
}

interface GitBranch {
    name: string
    current: boolean
    remote?: string
    lastCommit?: string
}

interface GitPanelProps {
    isOpen: boolean
    onClose: () => void
    projectPath?: string
}

const GitPanel = ({ isOpen, onClose }: GitPanelProps) => {
    const [activeTab, setActiveTab] = useState<'status' | 'history' | 'branches'>('status')
    const [status, setStatus] = useState<GitStatus | null>(null)
    const [commits, setCommits] = useState<GitCommit[]>([])
    const [branches, setBranches] = useState<GitBranch[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Form states
    const [commitMessage, setCommitMessage] = useState('')
    const [newBranchName, setNewBranchName] = useState('')
    const [remoteUrl, setRemoteUrl] = useState('')
    const [showRemoteDialog, setShowRemoteDialog] = useState(false)

    // Fetch git status
    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/status')
            if (!response.ok) throw new Error('Failed to fetch status')
            const data = await response.json()
            setStatus(data)
            setError(null)
        } catch (err: any) {
            setError(err.message)
            // Set default uninitialized status
            setStatus({
                initialized: false,
                branch: '',
                ahead: 0,
                behind: 0,
                staged: [],
                modified: [],
                untracked: [],
                hasRemote: false,
                remoteName: '',
                remoteUrl: '',
            })
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch commit history
    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/log?limit=50')
            if (!response.ok) throw new Error('Failed to fetch history')
            const data = await response.json()
            setCommits(data.commits || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // Fetch branches
    const fetchBranches = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/branches')
            if (!response.ok) throw new Error('Failed to fetch branches')
            const data = await response.json()
            setBranches(data.branches || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    // Load data based on active tab
    useEffect(() => {
        if (!isOpen) return

        if (activeTab === 'status') {
            fetchStatus()
        } else if (activeTab === 'history') {
            fetchHistory()
        } else if (activeTab === 'branches') {
            fetchBranches()
        }
    }, [isOpen, activeTab, fetchStatus, fetchHistory, fetchBranches])

    // Initialize repository
    const initRepo = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/init', { method: 'POST' })
            if (!response.ok) throw new Error('Failed to initialize repository')
            await fetchStatus()
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Stage files
    const stageFiles = async (files: string[]) => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files }),
            })
            if (!response.ok) throw new Error('Failed to stage files')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Unstage files
    const unstageFiles = async (files: string[]) => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/unstage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files }),
            })
            if (!response.ok) throw new Error('Failed to unstage files')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Commit changes
    const commit = async () => {
        if (!commitMessage.trim()) {
            setError('Please enter a commit message')
            return
        }
        try {
            setLoading(true)
            const response = await fetch('/api/git/commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: commitMessage }),
            })
            if (!response.ok) throw new Error('Failed to commit')
            setCommitMessage('')
            await fetchStatus()
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Push to remote
    const push = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/push', { method: 'POST' })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to push')
            }
            await fetchStatus()
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Pull from remote
    const pull = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/pull', { method: 'POST' })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to pull')
            }
            await fetchStatus()
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Add remote
    const addRemote = async () => {
        if (!remoteUrl.trim()) {
            setError('Please enter a remote URL')
            return
        }
        try {
            setLoading(true)
            const response = await fetch('/api/git/remote/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'origin', url: remoteUrl }),
            })
            if (!response.ok) throw new Error('Failed to add remote')
            setShowRemoteDialog(false)
            setRemoteUrl('')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Create branch
    const createBranch = async () => {
        if (!newBranchName.trim()) {
            setError('Please enter a branch name')
            return
        }
        try {
            setLoading(true)
            const response = await fetch('/api/git/branch/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBranchName }),
            })
            if (!response.ok) throw new Error('Failed to create branch')
            setNewBranchName('')
            await fetchBranches()
            await fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Switch branch
    const switchBranch = async (branchName: string) => {
        try {
            setLoading(true)
            const response = await fetch('/api/git/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: branchName }),
            })
            if (!response.ok) throw new Error('Failed to switch branch')
            await fetchBranches()
            await fetchStatus()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Delete branch
    const deleteBranch = async (branchName: string) => {
        if (!confirm(`Delete branch "${branchName}"?`)) return
        try {
            setLoading(true)
            const response = await fetch('/api/git/branch/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: branchName }),
            })
            if (!response.ok) throw new Error('Failed to delete branch')
            await fetchBranches()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="git-panel">
            <div className="git-header">
                <h3>📦 Git 版本控制</h3>
                <div className="git-header-actions">
                    {status?.initialized && (
                        <span className="branch-badge">
                            🔀 {status.branch}
                            {status.ahead > 0 && <span className="ahead">↑{status.ahead}</span>}
                            {status.behind > 0 && <span className="behind">↓{status.behind}</span>}
                        </span>
                    )}
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>
            </div>

            {error && (
                <div className="git-error">
                    ⚠️ {error}
                    <button onClick={() => setError(null)}>✕</button>
                </div>
            )}

            {!status?.initialized ? (
                <div className="git-uninit">
                    <div className="uninit-icon">📁</div>
                    <h4>项目未初始化 Git 仓库</h4>
                    <p>初始化 Git 仓库以开始版本控制</p>
                    <button
                        className="init-btn"
                        onClick={initRepo}
                        disabled={loading}
                    >
                        {loading ? '初始化中...' : '🚀 初始化 Git 仓库'}
                    </button>
                </div>
            ) : (
                <>
                    <div className="git-tabs">
                        <button
                            className={`tab ${activeTab === 'status' ? 'active' : ''}`}
                            onClick={() => setActiveTab('status')}
                        >
                            📋 状态
                        </button>
                        <button
                            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                        >
                            📜 历史
                        </button>
                        <button
                            className={`tab ${activeTab === 'branches' ? 'active' : ''}`}
                            onClick={() => setActiveTab('branches')}
                        >
                            🔀 分支
                        </button>
                    </div>

                    <div className="git-content">
                        {activeTab === 'status' && status && (
                            <div className="status-panel">
                                {/* Quick actions */}
                                <div className="quick-actions">
                                    <button onClick={pull} disabled={loading || !status.hasRemote}>
                                        ⬇️ Pull
                                    </button>
                                    <button onClick={push} disabled={loading || !status.hasRemote}>
                                        ⬆️ Push
                                    </button>
                                    <button onClick={fetchStatus} disabled={loading}>
                                        🔄 刷新
                                    </button>
                                    {!status.hasRemote && (
                                        <button onClick={() => setShowRemoteDialog(true)}>
                                            🔗 添加远程
                                        </button>
                                    )}
                                </div>

                                {/* Remote info */}
                                {status.hasRemote && (
                                    <div className="remote-info">
                                        <span className="remote-label">远程:</span>
                                        <span className="remote-url">{status.remoteUrl}</span>
                                    </div>
                                )}

                                {/* Staged files */}
                                {status.staged.length > 0 && (
                                    <div className="file-section staged">
                                        <div className="section-header">
                                            <span>✅ 已暂存 ({status.staged.length})</span>
                                            <button onClick={() => unstageFiles(status.staged)}>
                                                全部取消暂存
                                            </button>
                                        </div>
                                        <ul className="file-list">
                                            {status.staged.map(file => (
                                                <li key={file}>
                                                    <span className="file-icon">📄</span>
                                                    <span className="file-name">{file}</span>
                                                    <button onClick={() => unstageFiles([file])}>-</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Modified files */}
                                {status.modified.length > 0 && (
                                    <div className="file-section modified">
                                        <div className="section-header">
                                            <span>📝 已修改 ({status.modified.length})</span>
                                            <button onClick={() => stageFiles(status.modified)}>
                                                全部暂存
                                            </button>
                                        </div>
                                        <ul className="file-list">
                                            {status.modified.map(file => (
                                                <li key={file}>
                                                    <span className="file-icon">📝</span>
                                                    <span className="file-name">{file}</span>
                                                    <button onClick={() => stageFiles([file])}>+</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Untracked files */}
                                {status.untracked.length > 0 && (
                                    <div className="file-section untracked">
                                        <div className="section-header">
                                            <span>❓ 未跟踪 ({status.untracked.length})</span>
                                            <button onClick={() => stageFiles(status.untracked)}>
                                                全部暂存
                                            </button>
                                        </div>
                                        <ul className="file-list">
                                            {status.untracked.map(file => (
                                                <li key={file}>
                                                    <span className="file-icon">📄</span>
                                                    <span className="file-name">{file}</span>
                                                    <button onClick={() => stageFiles([file])}>+</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* All clean */}
                                {status.staged.length === 0 &&
                                    status.modified.length === 0 &&
                                    status.untracked.length === 0 && (
                                        <div className="all-clean">
                                            ✨ 工作区干净，没有需要提交的更改
                                        </div>
                                    )}

                                {/* Commit form */}
                                {status.staged.length > 0 && (
                                    <div className="commit-form">
                                        <textarea
                                            value={commitMessage}
                                            onChange={e => setCommitMessage(e.target.value)}
                                            placeholder="输入提交信息..."
                                            rows={3}
                                        />
                                        <button
                                            className="commit-btn"
                                            onClick={commit}
                                            disabled={loading || !commitMessage.trim()}
                                        >
                                            {loading ? '提交中...' : '✅ 提交'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="history-panel">
                                {commits.length === 0 ? (
                                    <div className="empty-state">暂无提交历史</div>
                                ) : (
                                    <div className="commit-list">
                                        {commits.map(commit => (
                                            <div key={commit.hash} className="commit-item">
                                                <div className="commit-header">
                                                    <span className="commit-hash">{commit.shortHash}</span>
                                                    <span className="commit-date">{commit.date}</span>
                                                </div>
                                                <div className="commit-message">{commit.message}</div>
                                                <div className="commit-author">👤 {commit.author}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'branches' && (
                            <div className="branches-panel">
                                {/* Create branch */}
                                <div className="create-branch">
                                    <input
                                        type="text"
                                        value={newBranchName}
                                        onChange={e => setNewBranchName(e.target.value)}
                                        placeholder="新分支名称..."
                                    />
                                    <button
                                        onClick={createBranch}
                                        disabled={loading || !newBranchName.trim()}
                                    >
                                        ➕ 创建
                                    </button>
                                </div>

                                {/* Branch list */}
                                <div className="branch-list">
                                    {branches.map(branch => (
                                        <div
                                            key={branch.name}
                                            className={`branch-item ${branch.current ? 'current' : ''}`}
                                        >
                                            <span className="branch-icon">
                                                {branch.current ? '🔹' : '○'}
                                            </span>
                                            <span className="branch-name">{branch.name}</span>
                                            <div className="branch-actions">
                                                {!branch.current && (
                                                    <>
                                                        <button onClick={() => switchBranch(branch.name)}>
                                                            切换
                                                        </button>
                                                        <button
                                                            className="delete"
                                                            onClick={() => deleteBranch(branch.name)}
                                                        >
                                                            删除
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Add Remote Dialog */}
            {showRemoteDialog && (
                <div className="dialog-overlay">
                    <div className="dialog">
                        <h4>🔗 添加远程仓库</h4>
                        <input
                            type="text"
                            value={remoteUrl}
                            onChange={e => setRemoteUrl(e.target.value)}
                            placeholder="https://github.com/user/repo.git"
                        />
                        <div className="dialog-actions">
                            <button onClick={() => setShowRemoteDialog(false)}>取消</button>
                            <button onClick={addRemote} disabled={loading}>
                                {loading ? '添加中...' : '添加'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <div className="loading-overlay">加载中...</div>}
        </div>
    )
}

export default GitPanel
