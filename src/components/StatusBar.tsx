interface Props {
  status: string;
}

export function StatusBar({ status }: Props) {
  return <div id="status">{status}</div>;
}
