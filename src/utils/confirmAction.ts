type ConfirmOptions = {
  title: string;
  detail?: string;
};

export const confirmAction = ({ title, detail }: ConfirmOptions): boolean => {
  const message = detail ? `${title}\n\n${detail}` : title;
  return window.confirm(message);
};
