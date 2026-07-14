interface ChatWindowProps {
  children?: React.ReactNode;
}

export default function ChatWindow({
  children,
}: ChatWindowProps) {
  return (
    <div className="flex-1 flex flex-col">
      {children}
    </div>
  );
}