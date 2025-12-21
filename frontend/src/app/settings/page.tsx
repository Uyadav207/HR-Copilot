'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings as SettingsIcon, Bell, User, Shield, Sparkles, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }
  }
}

const settingsCards = [
  {
    title: 'Account',
    description: 'Manage your account information and profile',
    icon: User,
    gradient: 'from-blue-500 to-cyan-500',
    comingSoon: true
  },
  {
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: Bell,
    gradient: 'from-purple-500 to-pink-500',
    comingSoon: true
  },
  {
    title: 'Security',
    description: 'Manage security and privacy settings',
    icon: Shield,
    gradient: 'from-green-500 to-emerald-500',
    comingSoon: true
  },
  {
    title: 'Preferences',
    description: 'Customize your application preferences',
    icon: SettingsIcon,
    gradient: 'from-amber-500 to-orange-500',
    comingSoon: true
  }
]

export default function SettingsPage() {
  const { logout, user } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <SettingsIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </motion.div>

      {/* Settings Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid gap-6 md:grid-cols-2"
      >
        {settingsCards.map((setting) => {
          const Icon = setting.icon
          return (
            <motion.div
              key={setting.title}
              variants={itemVariants}
              whileHover={{ y: -4, scale: 1.02 }}
              className="group relative"
            >
              {/* Glow effect on hover */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${setting.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur transition-opacity`} />
              
              <Card className="relative h-full border-2 hover:border-purple-500/30 transition-all duration-300 overflow-hidden">
                {/* Gradient accent */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${setting.gradient} opacity-5 rounded-bl-full`} />
                
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${setting.gradient} flex items-center justify-center shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{setting.title}</CardTitle>
                  </div>
                  <CardDescription>{setting.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {setting.comingSoon ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border">
                        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-sm text-muted-foreground">Coming soon</span>
                      </div>
                      <Button variant="outline" disabled className="w-full">
                        Configure Settings
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full">
                      Manage
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Logout Section */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
      >
        <Separator className="my-8" />
        <Card className="border-2 border-destructive/20 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-lg">
                <LogOut className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Sign Out</CardTitle>
                <CardDescription>
                  Sign out of your account
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {user && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{user.email}</span>
                </div>
              )}
              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
