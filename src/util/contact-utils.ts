export function getFullName(item: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  name: string | null | undefined;
}) {
  if (!item) {
    return null;
  }

  if (item.firstName && item.lastName) {
    return `${item.firstName} ${item.lastName}`;
  }

  if (item.firstName && !item.lastName) {
    return `${item.firstName}`;
  }

  if (!item.firstName && item.lastName) {
    return `${item.lastName}`;
  }

  return item.name ?? null;
}
