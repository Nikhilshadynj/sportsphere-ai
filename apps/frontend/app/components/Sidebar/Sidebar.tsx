interface SidebarProps {
  children?: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  return (
    <div className="w-72 border-r border-zinc-800 flex flex-col">
      {children}
    </div>
  );
}