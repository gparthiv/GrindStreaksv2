import { HistoryData, DayRecord } from '../types';

/**
 * Exports historical logs for a given month or all-time into a clean CSV file
 */
export const exportToCSV = (history: HistoryData, selectedMonth?: string) => {
  const headers = [
    'Date',
    'Completion %',
    'Total Tasks',
    'Completed Tasks',
    'Incomplete Tasks',
    'Total Active Work (Hours)',
    'Routine Duration (Mins)',
    'DSA Duration (Mins)',
    'Web Duration (Mins)',
    'Certificates Duration (Mins)',
    'CAT Duration (Mins)',
    'Custom Tasks Duration (Mins)',
  ];

  const rows = Object.entries(history)
    .filter(([date]) => {
      if (!selectedMonth) return true; // Export all
      return date.startsWith(selectedMonth); // YYYY-MM
    })
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA)) // newest first
    .map(([date, record]) => {
      // Calculate durations per category
      const durations: { [cat: string]: number } = {
        Routine: 0,
        DSA: 0,
        Web: 0,
        Certificates: 0,
        CAT: 0,
        Custom: 0,
      };

      record.tasks.forEach(task => {
        const cat = task.category;
        const durMins = Math.round((task.duration || 0) / (1000 * 60));
        if (task.type === 'Custom') {
          durations['Custom'] += durMins;
        } else if (durations[cat] !== undefined) {
          durations[cat] += durMins;
        }
      });

      const completedNames = record.tasks
        .filter(t => t.status === 'completed')
        .map(t => t.name.replace(/"/g, '""'))
        .join('; ');

      const incompleteNames = record.tasks
        .filter(t => t.status !== 'completed')
        .map(t => t.name.replace(/"/g, '""'))
        .join('; ');

      return [
        date,
        `${record.completionRate}%`,
        record.totalCount,
        record.completedCount,
        `"${incompleteNames}"`,
        (record.studyTime / (1000 * 60 * 60)).toFixed(2),
        durations['Routine'],
        durations['DSA'],
        durations['Web'],
        durations['Certificates'],
        durations['CAT'],
        durations['Custom'],
      ];
    });

  const csvContent = [
    headers.join(','),
    ...rows.map(e => e.join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const filename = selectedMonth 
    ? `consistency_report_${selectedMonth}.csv` 
    : 'consistency_report_all_time.csv';
    
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Triggers a beautiful browser-print-based PDF save.
 * It hides non-report components and triggers window.print().
 */
export const exportToPDF = () => {
  window.print();
};
