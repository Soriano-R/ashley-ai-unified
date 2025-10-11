'use client'

import { useState } from 'react'
import { User } from '@/types'
import { XMarkIcon, MagnifyingGlassIcon, UserPlusIcon, CreditCardIcon, ChartBarIcon } from '@heroicons/react/24/outline'

interface UserManagerProps {
  isOpen: boolean
  onClose: () => void
}

interface ManagedUser extends User {
  lastActive: Date
  totalSessions: number
  tokensUsed: number
  subscriptionPlan: 'free' | 'premium' | 'enterprise'
  isArchived: boolean
  demographics: {
    age?: number
    location?: string
    preferences?: string[]
  }
}

interface Transaction {
  id: string
  userId: string
  amount: number
  currency: string
  type: 'subscription' | 'usage' | 'credit'
  status: 'completed' | 'pending' | 'failed'
  date: Date
  description: string
}

export default function UserManager({ isOpen, onClose }: UserManagerProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'payments' | 'analytics'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  // Mock user data - in production, this would come from backend
  const [users] = useState<ManagedUser[]>([
    {
      id: '1',
      email: 'admin@ashley.ai',
      name: 'Admin User',
      role: 'admin',
      createdAt: new Date('2024-01-15'),
      lastActive: new Date(),
      totalSessions: 45,
      tokensUsed: 125000,
      subscriptionPlan: 'enterprise',
      isArchived: false,
      demographics: {
        age: 35,
        location: 'San Francisco, CA',
        preferences: ['AI Development', 'System Administration', 'Data Analysis']
      }
    },
    {
      id: '2',
      email: 'user@ashley.ai',
      name: 'Regular User',
      role: 'user',
      createdAt: new Date('2024-02-20'),
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      totalSessions: 23,
      tokensUsed: 45000,
      subscriptionPlan: 'premium',
      isArchived: false,
      demographics: {
        age: 28,
        location: 'New York, NY',
        preferences: ['Creative Writing', 'Research', 'Learning']
      }
    },
    {
      id: '3',
      email: 'john.doe@company.com',
      name: 'John Doe',
      role: 'user',
      createdAt: new Date('2024-03-10'),
      lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      totalSessions: 12,
      tokensUsed: 18000,
      subscriptionPlan: 'free',
      isArchived: false,
      demographics: {
        age: 42,
        location: 'London, UK',
        preferences: ['Business Analysis', 'Project Management']
      }
    }
  ])

  // Mock transaction data
  const [transactions] = useState<Transaction[]>([
    {
      id: 'txn_001',
      userId: '2',
      amount: 29.99,
      currency: 'USD',
      type: 'subscription',
      status: 'completed',
      date: new Date('2024-10-01'),
      description: 'Premium Plan - Monthly'
    },
    {
      id: 'txn_002',
      userId: '1',
      amount: 99.99,
      currency: 'USD',
      type: 'subscription',
      status: 'completed',
      date: new Date('2024-10-01'),
      description: 'Enterprise Plan - Monthly'
    },
    {
      id: 'txn_003',
      userId: '2',
      amount: 15.50,
      currency: 'USD',
      type: 'usage',
      status: 'completed',
      date: new Date('2024-09-28'),
      description: 'Additional API Usage'
    },
    {
      id: 'txn_004',
      userId: '3',
      amount: 5.00,
      currency: 'USD',
      type: 'credit',
      status: 'completed',
      date: new Date('2024-09-25'),
      description: 'Welcome Credit'
    }
  ])

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleShowPaymentHistory = (user: ManagedUser) => {
    setSelectedUser(user)
    setShowPaymentHistory(true)
  }

  const getUserTransactions = (userId: string) => {
    return transactions.filter(txn => txn.userId === userId)
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex min-h-full items-center justify-center p-4 z-50">
      <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">User Management</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Payment History Modal */}
        {showPaymentHistory && selectedUser && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-10">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">
                  Payment History - {selectedUser.name}
                </h3>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Payment Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Total Spent</div>
                      <div className="text-xl font-semibold text-white">
                        {formatCurrency(
                          getUserTransactions(selectedUser.id)
                            .filter(txn => txn.status === 'completed')
                            .reduce((sum, txn) => sum + txn.amount, 0)
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Transactions</div>
                      <div className="text-xl font-semibold text-white">
                        {getUserTransactions(selectedUser.id).length}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="text-sm text-gray-400">Current Plan</div>
                      <div className="text-xl font-semibold text-white capitalize">
                        {selectedUser.subscriptionPlan}
                      </div>
                    </div>
                  </div>

                  {/* Transaction History */}
                  <div>
                    <h4 className="text-lg font-medium text-white mb-4">Transaction History</h4>
                    <div className="space-y-3">
                      {getUserTransactions(selectedUser.id).map(transaction => (
                        <div key={transaction.id} className="bg-gray-900 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  transaction.status === 'completed' ? 'bg-green-400' :
                                  transaction.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                                }`}></div>
                                <span className="font-medium text-white">{transaction.description}</span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  transaction.type === 'subscription' ? 'bg-blue-600 text-blue-100' :
                                  transaction.type === 'usage' ? 'bg-purple-600 text-purple-100' :
                                  'bg-green-600 text-green-100'
                                }`}>
                                  {transaction.type}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400 mt-1">
                                {formatDate(transaction.date)} • ID: {transaction.id}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-white">
                                {formatCurrency(transaction.amount, transaction.currency)}
                              </div>
                              <div className={`text-sm capitalize ${
                                transaction.status === 'completed' ? 'text-green-400' :
                                transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                              }`}>
                                {transaction.status}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {getUserTransactions(selectedUser.id).length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          No transactions found for this user.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'users', name: 'Users', icon: MagnifyingGlassIcon },
            { id: 'payments', name: 'Payments', icon: CreditCardIcon },
            { id: 'analytics', name: 'Analytics', icon: ChartBarIcon }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'users' | 'payments' | 'analytics')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Search and Controls */}
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <UserPlusIcon className="w-4 h-4" />
                  Add User
                </button>
              </div>

              {/* Users List */}
              <div className="space-y-4">
                {filteredUsers.map(user => (
                  <div key={user.id} className="bg-gray-700 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'
                        }`}>
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-white">{user.name}</h3>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.role === 'admin' ? 'bg-red-600 text-red-100' : 'bg-blue-600 text-blue-100'
                            }`}>
                              {user.role}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              user.subscriptionPlan === 'enterprise' ? 'bg-purple-600 text-purple-100' :
                              user.subscriptionPlan === 'premium' ? 'bg-yellow-600 text-yellow-100' :
                              'bg-gray-600 text-gray-100'
                            }`}>
                              {user.subscriptionPlan}
                            </span>
                          </div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                          <div className="text-gray-500 text-xs">
                            Created: {formatDate(user.createdAt)} • Last Active: {formatDate(user.lastActive)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleShowPaymentHistory(user)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                        >
                          Payment History
                        </button>
                        <button className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm">
                          Edit
                        </button>
                        {!user.isArchived && (
                          <button className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm">
                            Archive
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* User Stats */}
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{user.totalSessions}</div>
                        <div className="text-xs text-gray-400">Sessions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">{user.tokensUsed.toLocaleString()}</div>
                        <div className="text-xs text-gray-400">Tokens Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-white">
                          {user.demographics.location || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-400">Location</div>
                      </div>
                    </div>

                    {/* Demographics */}
                    {user.demographics.preferences && user.demographics.preferences.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-1">Interests:</div>
                        <div className="flex flex-wrap gap-1">
                          {user.demographics.preferences.map((pref, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                              {pref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">Payment Management</h3>
              
              {/* Payment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Total Revenue</div>
                  <div className="text-xl font-semibold text-white">
                    {formatCurrency(
                      transactions
                        .filter(txn => txn.status === 'completed')
                        .reduce((sum, txn) => sum + txn.amount, 0)
                    )}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Active Subscriptions</div>
                  <div className="text-xl font-semibold text-white">
                    {users.filter(u => u.subscriptionPlan !== 'free').length}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Failed Payments</div>
                  <div className="text-xl font-semibold text-white">
                    {transactions.filter(txn => txn.status === 'failed').length}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Pending Payments</div>
                  <div className="text-xl font-semibold text-white">
                    {transactions.filter(txn => txn.status === 'pending').length}
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h4 className="text-lg font-medium text-white mb-4">Recent Transactions</h4>
                <div className="space-y-3">
                  {transactions.slice(0, 10).map(transaction => {
                    const user = users.find(u => u.id === transaction.userId)
                    return (
                      <div key={transaction.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                transaction.status === 'completed' ? 'bg-green-400' :
                                transaction.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                              }`}></div>
                              <span className="font-medium text-white">{user?.name || 'Unknown User'}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-300">{transaction.description}</span>
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {formatDate(transaction.date)} • {user?.email || 'No email'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-white">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </div>
                            <div className={`text-sm capitalize ${
                              transaction.status === 'completed' ? 'text-green-400' :
                              transaction.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {transaction.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-white">User Analytics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-700 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-white mb-4">User Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Admin Users</span>
                      <span className="text-white font-medium">
                        {users.filter(u => u.role === 'admin').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Regular Users</span>
                      <span className="text-white font-medium">
                        {users.filter(u => u.role === 'user').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Subscription Plans</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Free</span>
                      <span className="text-white font-medium">
                        {users.filter(u => u.subscriptionPlan === 'free').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Premium</span>
                      <span className="text-white font-medium">
                        {users.filter(u => u.subscriptionPlan === 'premium').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Enterprise</span>
                      <span className="text-white font-medium">
                        {users.filter(u => u.subscriptionPlan === 'enterprise').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-white mb-4">Usage Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Sessions</span>
                      <span className="text-white font-medium">
                        {users.reduce((sum, u) => sum + u.totalSessions, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Total Tokens</span>
                      <span className="text-white font-medium">
                        {users.reduce((sum, u) => sum + u.tokensUsed, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
