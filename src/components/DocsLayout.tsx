import { Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DesignButton } from "@/components/ds/DesignButton";
import { Check, FlaskConical } from "lucide-react";
import {
  Square, AlertCircle, Circle, CircleDot, CheckSquare, ToggleRight, Tag, Table2,
  FormInput, AlignLeft, ChevronDown, List, LayoutGrid, Image, Images,
  Navigation2, PanelBottom, Minus, Palette, Type, Ruler, BookOpen,
  ArrowLeft, Columns, PanelBottomOpen, Search, ChevronsUpDown,
  Package, Loader2, Star, MessageSquare, Megaphone, Activity,
  MessageCircle, StickyNote, GalleryHorizontal, Bell, ListOrdered,
  Hash, Space, ShieldCheck, Tags, Grid3X3, PanelTop, PanelLeft, FileText, BarChart3, PanelTopInactive, LayoutDashboard, PanelRight
} from "lucide-react";

const realWorldComponents = new Set([
  "Accordion", "Badge", "BottomNavigation", "BottomSheet", "Bubble", "Button",
  "Card", "Carousel", "Cell", "Checkbox", "Chip", "Dialog",
  "Divider", "DoubleImage", "EmptyState", "Image", "InfoBanner", "InputBar",
  "InputSelect", "InputText", "InputTextArea", "Label", "List", "Loader", "Navigation",
  "Note", "Notification", "Pagination", "PageHeader", "ProgressIndicator", "PromoBanner", "Radio",
  "Rating", "SelectionGroup", "SideSheet", "Sidebar", "StatCard", "TopAndSideNav", "TwoLevelSidebar", "Spacer", "Tabs", "Toggle", "Tooltip", "Validation", "TopBar",
]);

const gettingStarted = [
  { name: "Introduction", path: "/docs", icon: BookOpen },
];

const foundations = [
  { name: "Colors", path: "/docs/colors", icon: Palette },
  { name: "Typography", path: "/docs/typography", icon: Type },
  { name: "Spacing", path: "/docs/spacing", icon: Ruler },
];
const verifiedComponents = new Set([
  "Accordion", "BottomNavigation", "BottomSheet", "Button", "Checkbox", "Chip", "Badge", "Card", "Cell", "Image",
  "DoubleImage", "Bubble", "Note", "Carousel", "List",
  "Pagination", "PageHeader", "Validation", "Dialog", "Divider", "EmptyState", "InfoBanner", "Loader",
  "InputText", "InputTextArea", "InputBar", "InputSelect", "Label", "Navigation", "Notification",
  "ProgressIndicator", "PromoBanner", "Radio", "Rating", "SelectionGroup", "SideSheet", "Sidebar", "StatCard", "TopAndSideNav", "TwoLevelSidebar", "Spacer", "Tabs", "Toggle", "Tooltip",
  "TopBar",
]);

const components = [
  { name: "Accordion", path: "/docs/accordion", icon: ChevronsUpDown },
  { name: "Badge", path: "/docs/badge", icon: Tag },
  { name: "BottomNavigation", path: "/docs/bottom-navigation", icon: PanelBottom },
  { name: "BottomSheet", path: "/docs/bottom-sheet", icon: PanelBottomOpen },
  { name: "Bubble", path: "/docs/bubble", icon: MessageCircle },
  { name: "Button", path: "/docs/button", icon: Square },
  { name: "Card", path: "/docs/card", icon: LayoutGrid },
  { name: "Carousel", path: "/docs/carousel", icon: GalleryHorizontal },
  { name: "Cell", path: "/docs/cell", icon: List },
  { name: "Checkbox", path: "/docs/checkbox", icon: CheckSquare },
  { name: "Chip", path: "/docs/chip", icon: Circle },
  { name: "Dialog", path: "/docs/dialog", icon: MessageSquare },
  { name: "Divider", path: "/docs/divider", icon: Minus },
  { name: "DoubleImage", path: "/docs/double-image", icon: Images },
  { name: "EmptyState", path: "/docs/empty-state", icon: Package },
  { name: "Grid", path: "/docs/grid", icon: LayoutDashboard },
  { name: "Image", path: "/docs/image", icon: Image },
  { name: "InfoBanner", path: "/docs/info-banner", icon: AlertCircle },
  { name: "InputBar", path: "/docs/input-bar", icon: Search },
  { name: "InputSelect", path: "/docs/input-select", icon: ChevronDown },
  { name: "InputText", path: "/docs/input-text", icon: FormInput },
  { name: "InputTextArea", path: "/docs/input-textarea", icon: AlignLeft },
  { name: "List", path: "/docs/list", icon: ListOrdered },
  { name: "Loader", path: "/docs/loader", icon: Loader2 },
  { name: "Navigation", path: "/docs/navigation", icon: Navigation2 },
  { name: "PageHeader", path: "/docs/page-header", icon: FileText },
  { name: "Note", path: "/docs/note", icon: StickyNote },
  { name: "Notification", path: "/docs/notification", icon: Bell },
  { name: "Pagination", path: "/docs/pagination", icon: Hash },
  { name: "ProgressIndicator", path: "/docs/progress-indicator", icon: Activity },
  { name: "PromoBanner", path: "/docs/promo-banner", icon: Megaphone },
  { name: "Radio", path: "/docs/radio", icon: CircleDot },
  { name: "Rating", path: "/docs/rating", icon: Star },
  { name: "Spacer", path: "/docs/spacer", icon: Space },
  { name: "Tabs", path: "/docs/tabs", icon: Columns },
  { name: "Toggle", path: "/docs/toggle", icon: ToggleRight },
  { name: "Tooltip", path: "/docs/tooltip", icon: MessageSquare },
  { name: "Validation", path: "/docs/validation", icon: ShieldCheck },
  { name: "Label", path: "/docs/label", icon: Tags },
  
  { name: "SelectionGroup", path: "/docs/selection-group", icon: Grid3X3 },
  { name: "StatCard", path: "/docs/stat-card", icon: BarChart3 },
  { name: "DataTable", path: "/docs/data-table", icon: Table2 },
  { name: "TopAndSideNav", path: "/docs/top-and-side-nav", icon: PanelTopInactive },
  { name: "TopBar", path: "/docs/top-bar", icon: PanelTop },
  { name: "SideSheet", path: "/docs/side-sheet", icon: PanelRight },
  { name: "Sidebar", path: "/docs/sidebar", icon: PanelLeft },
  { name: "TwoLevelSidebar", path: "/docs/two-level-sidebar", icon: Columns },
];

const NavSection = ({
  title,
  items,
  currentPath
}: {
  title: string;
  items: typeof components;
  currentPath: string;
}) => (
  <>
    <div className="text-xs font-medium text-docs-muted uppercase tracking-wide px-2 mb-2 mt-4 first:mt-0">
      {title}
    </div>
    <ul className="space-y-1">
      {items.map((item) => {
        const isActive = currentPath === item.path;
        const Icon = item.icon;
        const isVerified = verifiedComponents.has(item.name);
        return (
          <li key={item.path}>
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-docs-foreground hover:bg-docs-code"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="flex-1">{item.name}</span>
              {realWorldComponents.has(item.name) && <FlaskConical className="w-3.5 h-3.5 text-[var(--primary)]" />}
              {isVerified && <Check className="w-3.5 h-3.5 text-[var(--success-default)]" />}
            </Link>
          </li>
        );
      })}
    </ul>
  </>
);

const DocsLayout = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-docs-border bg-background px-6 py-3 flex items-center shadow-sm">
        <Link to="/">
          <DesignButton size="medium" theme="primary" variant="filled" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </DesignButton>
        </Link>
      </header>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-64 border-r border-docs-border bg-background shrink-0 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-docs-heading mb-1">Mini Bloom</h2>
            <p className="text-xs text-docs-muted">Design System Documentation</p>
          </div>

          <nav className="px-4 pb-6">
            <NavSection title="Getting Started" items={gettingStarted} currentPath={location.pathname} />
            <NavSection title="Foundations" items={foundations} currentPath={location.pathname} />
            <NavSection title="Components" items={components} currentPath={location.pathname} />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-57px)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DocsLayout;
