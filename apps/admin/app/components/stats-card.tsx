type StatsCardProps = {
  title: string;
  value: number | string;
  description?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
};

const colorMap = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  red: 'bg-red-50 text-red-700',
  yellow: 'bg-yellow-50 text-yellow-700',
} as const;

/** A card for displaying a single dashboard stat */
export const StatsCard = ({ title, value, description, color = 'blue' }: StatsCardProps) => {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className={`mt-2 text-3xl font-bold ${colorMap[color].split(' ')[1]}`}>{value}</p>
      {description && (
        <p className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${colorMap[color]}`}>
          {description}
        </p>
      )}
    </div>
  );
};
