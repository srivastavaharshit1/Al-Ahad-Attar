export const downloadCSV = (data: Record<string, any>[], filename: string) => {
  if (!data || !data.length) {
    return;
  }

  // Get headers from first object keys
  const headers = Object.keys(data[0]);

  // Map each row to CSV string
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) {
          val = '';
        }
        // If string contains comma, newline or quotes, wrap in quotes and escape internal quotes
        const valStr = String(val);
        if (valStr.includes(',') || valStr.includes('\n') || valStr.includes('"')) {
          return `"${valStr.replace(/"/g, '""')}"`;
        }
        return valStr;
      }).join(',')
    )
  ].join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
