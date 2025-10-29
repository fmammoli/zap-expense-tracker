export default function checkIfNumberMatches(
  clerkNumber: string,
  waNumber: string
) {
  const normalizedClerkNumber = clerkNumber.replace("+", "");
  const normalizedWaNumber = waNumber.replace("+", "");

  if (normalizedClerkNumber === normalizedWaNumber) {
    return true;
  }

  if (normalizedClerkNumber.length > normalizedWaNumber.length) {
    const adjustedWaNumber = `${normalizedClerkNumber.slice(
      0,
      4
    )}${normalizedClerkNumber.slice(5)}`;
    if (adjustedWaNumber === normalizedWaNumber) {
      return true;
    }
  }
  if (normalizedClerkNumber.length < normalizedWaNumber.length) {
    const adjustedWaNumber = `${normalizedWaNumber.slice(
      0,
      4
    )}${normalizedWaNumber.slice(5)}`;
    if (adjustedWaNumber === normalizedClerkNumber) {
      return true;
    }
  }
  return false;
}
