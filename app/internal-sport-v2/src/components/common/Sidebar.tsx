import React from 'react';
import { ChevronLeft, ChevronRight, Home, FileText, Settings, Users, ClipboardList } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ isCollapsed, onToggle, currentView, onNavigate }: SidebarProps) {
  const { t } = useTranslation();

  const menuItems = [
    { id: 'home', label: t('sidebar.home'), icon: Home },
    { id: 'evaluations', label: t('sidebar.evaluations'), icon: ClipboardList },
    { id: 'templates', label: t('sidebar.templates'), icon: FileText },
    { id: 'suppliers', label: t('sidebar.suppliers'), icon: Users },
    { id: 'settings', label: t('sidebar.settings'), icon: Settings },
  ];

  return (
    <div
      className={`h-screen bg-card border-r border-border transition-all duration-300 flex flex-col ${isCollapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{t('app.title')}</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="p-1 h-8 w-8"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <Button
              key={item.id}
              variant="ghost"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-start gap-3 px-4 py-3 h-auto transition-colors ${isActive
                ? 'bg-primary/10 text-primary border-r-2 border-primary'
                : 'text-foreground hover:bg-muted'
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              {!isCollapsed && <span>{item.label}</span>}
            </Button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">JD</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">John Doe</div>
              <div className="text-xs text-muted-foreground truncate">{t('sidebar.procurement')}</div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-sm font-medium text-muted-foreground">JD</span>
          </div>
        )}
      </div>
    </div>
  );
}