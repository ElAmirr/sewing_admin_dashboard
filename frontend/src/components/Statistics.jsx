export default function Statistics({ logs }) {
  const byDay = {};

  logs.forEach(log => {
    if (!log.cycle_start_time) return;

    const day = new Date(log.cycle_start_time)
      .toISOString()
      .slice(0, 10);

    byDay[day] = (byDay[day] || 0) + 1;
  });

  return (
    <div>
      <h3>📈 Cycles per Day</h3>

      <table border="1" cellPadding="8">
        <thead>
          <tr>
            <th>Date</th>
            <th>Cycles</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(byDay).map(([day, count]) => (
            <tr key={day}>
              <td>{day}</td>
              <td>{count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
