import { LayoutDashboard, Briefcase, FileText, GitBranch, History, User, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';                  // ✅ keep your custom NavLink
import { useLocation } from 'react-router-dom';                  // ✅ only use useLocation from RRD
import { useAuth } from '@/lib/auth';
import ShortlistedBadge from "@/components/ShortlistedBadge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const navigation = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Jobs', url: '/jobs', icon: Briefcase },
  { title: 'Resumes', url: '/resumes', icon: FileText },
  { title: 'Pipeline', url: '/pipeline', icon: GitBranch },
  { title: 'History', url: '/history', icon: History },
  { title: 'Profile', url: '/profile', icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const collapsed = state === 'collapsed';

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-sidebar-primary" />
            <span className="font-semibold text-sidebar-foreground">Resume Screening</span>
          </div>
        ) : (
          <Briefcase className="h-6 w-6 text-sidebar-primary mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'sr-only' : ''}>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    {/* Make row stretch so we can justify-between */}
                    <NavLink
                      to={item.url}
                      className="flex w-full items-center justify-between rounded px-3 py-2 hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      aria-current={isActive(item.url) ? 'page' : undefined}
                    >
                      {/* Left side: icon + label */}
                      <span className="flex items-center gap-3">
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </span>

                      {/* Right side: shortlisted count only for Resumes and only when expanded */}
                      {!collapsed && item.title === 'Resumes' ? <ShortlistedBadge /> : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.user_metadata?.name || 'User'}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{user?.email}</p>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={signOut} className={collapsed ? 'mx-auto' : ''}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
