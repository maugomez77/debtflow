"""DebtFlow CLI — beautiful typer + rich interface."""
from __future__ import annotations

import webbrowser
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.text import Text
from rich.tree import Tree

from .api.analyzer import analyze_directory
from .api.cost import build_cost_breakdown, calculate_roi
from .api.github import clone_repo, get_file_churn
from .config import settings

app = typer.Typer(name="debtflow", help="Technical Debt Quantifier", add_completion=False)
console = Console()

HEADER_PANEL = Panel.fit(
    Text("🔥 DebtFlow — Technical Debt Quantifier", style="bold orange1"),
    border_style="orange3",
    padding=(1, 2),
)

COLOR_MAP = {
    "critical": "red1",
    "high": "orange1",
    "medium": "yellow1",
    "low": "green1",
}


@app.command()
def scan(
    repo_url: str = typer.Option(..., "--repo", help="GitHub repository URL to scan"),
    branch: str = typer.Option("main", "--branch", "-b", help="Branch to analyze"),
    hourly_rate: float = typer.Option(0.0, "--rate", "-r", help="Hourly rate override (default: $150)"),
):
    """Scan a GitHub repository for technical debt."""
    console.print(HEADER_PANEL)

    with Progress(
        SpinnerColumn("dots2", style="orange1"),
        TextColumn("[progress.description]{task.description}"),
        console=console,
    ) as progress:
        task = progress.add_task("[orange1]Cloning repository...", total=None)
        rate = hourly_rate if hourly_rate > 0 else settings.HOURLY_RATE
        repo_path = clone_repo(repo_url, branch)
        progress.update(task, description="[orange1]Analyzing commit history...")
        churn_data = get_file_churn(repo_path)
        progress.update(task, description="[orange1]Scanning code for debt...")
        items = analyze_directory(repo_path, churn_data)
        progress.update(task, description="[orange1]Calculating costs...")
        breakdown = build_cost_breakdown(items, rate)

    console.print()
    console.print(Panel(f"Scan complete — found [bold red]{len(items)}[/] debt items", border_style="green"))

    # Summary table
    table = Table(title="Debt Summary", title_style="bold orange1", border_style="orange3")
    table.add_column("Metric", style="bold cyan")
    table.add_column("Value", style="bold white")
    table.add_row("Total Items", str(len(items)))
    table.add_row("Total Hours", f"{breakdown['total_hours']:.1f}h")
    table.add_row("Hourly Rate", f"${rate:,.0f}")
    table.add_row("Total Cost", f"[bold red]${breakdown['total_cost']:,.2f}[/]")
    table.add_row("Projected Monthly", f"[bold yellow]${breakdown['projected_monthly_cost']:,.2f}[/]")
    console.print(table)

    # Severity breakdown
    console.print()
    sev_table = Table(title="By Severity", title_style="bold orange1", border_style="orange3")
    sev_table.add_column("Severity", style="bold")
    sev_table.add_column("Cost", justify="right")
    for sev, cost in sorted(breakdown["by_severity"].items(), key=lambda x: x[1], reverse=True):
        color = COLOR_MAP.get(sev, "white")
        sev_table.add_row(f"[{color}]{sev.upper()}[/]", f"[{color}]${cost:,.2f}[/]")
    console.print(sev_table)

    # Top items
    console.print()
    top_items = sorted(items, key=lambda i: i["estimated_hours"], reverse=True)[:10]
    item_table = Table(title="Top Debt Items", title_style="bold orange1", border_style="orange3")
    item_table.add_column("File", style="cyan", no_wrap=True)
    item_table.add_column("Title", style="white")
    item_table.add_column("Severity")
    item_table.add_column("Hours", justify="right")
    item_table.add_column("Cost", justify="right", style="red1")
    for item in top_items:
        color = COLOR_MAP.get(item.get("severity", "medium"), "white")
        item_table.add_row(
            item["file_path"],
            item["title"][:60],
            f"[{color}]{item.get('severity', '?').upper()}[/]",
            f"{item['estimated_hours']:.1f}",
            f"${item['estimated_hours'] * rate:,.2f}",
        )
    console.print(item_table)


@app.command()
def report():
    """Display a formatted debt report (requires running backend API)."""
    console.print(HEADER_PANEL)
    console.print("[yellow]Run the API server and visit the dashboard for full reports.[/]")
    console.print("[cyan]Start with:[/] [bold]debtflow dashboard[/]")


@app.command()
def cost(
    repo_url: str = typer.Option(None, "--repo", help="GitHub repo to analyze"),
    hourly_rate: float = typer.Option(0.0, "--rate", "-r", help="Hourly rate in USD"),
):
    """Show a dollar-cost breakdown of technical debt."""
    console.print(HEADER_PANEL)

    if repo_url:
        rate = hourly_rate if hourly_rate > 0 else settings.HOURLY_RATE

        with Progress(
            SpinnerColumn("dots2", style="orange1"),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task("[orange1]Analyzing repository...", total=None)
            repo_path = clone_repo(repo_url)
            churn_data = get_file_churn(repo_path)
            items = analyze_directory(repo_path, churn_data)
            breakdown = build_cost_breakdown(items, rate)
            progress.update(task, completed=True)

        console.print()
        cost_table = Table(title=f"Cost Breakdown — ${breakdown['total_cost']:,.2f}", border_style="orange3")
        cost_table.add_column("Category", style="bold cyan")
        cost_table.add_column("Cost", justify="right", style="bold red1")
        cost_table.add_column("Percentage", justify="right", style="yellow1")

        total = breakdown["total_cost"]
        for cat, cat_cost in sorted(breakdown["by_category"].items(), key=lambda x: x[1], reverse=True):
            pct = (cat_cost / total * 100) if total > 0 else 0
            cost_table.add_row(cat.replace("_", " ").title(), f"${cat_cost:,.2f}", f"{pct:.1f}%")

        console.print(cost_table)

        console.print()
        console.print(
            Panel(
                f"[bold]Total Technical Debt:[/] [red]$ {breakdown['total_cost']:,.2f}[/]\n"
                f"[bold]Hourly Rate:[/] ${rate:,.0f}/hr\n"
                f"[bold]Total Hours:[/] {breakdown['total_hours']:.1f}h\n"
                f"[bold]Est. Monthly Waste:[/] [yellow]${breakdown['projected_monthly_cost']:,.2f}[/]",
                title="💰 Cost Summary",
                border_style="orange3",
            )
        )
    else:
        console.print("[yellow]Provide --repo URL to analyze. Or use the web dashboard.[/]")


@app.command()
def timeline():
    """View debt history over time (requires backend API)."""
    console.print(HEADER_PANEL)
    console.print("[yellow]Run the API server and visit the dashboard for timeline charts.[/]")
    console.print("[cyan]Start with:[/] [bold]debtflow dashboard[/]")


@app.command()
def roi(
    item_id: str = typer.Option(None, "--item", help="Debt item ID"),
    hours: float = typer.Option(0.0, "--hours", "-h", help="Hours to fix"),
    hourly_rate: float = typer.Option(0.0, "--rate", "-r", help="Hourly rate"),
):
    """Calculate ROI of paying off a specific debt item."""
    console.print(HEADER_PANEL)

    rate = hourly_rate if hourly_rate > 0 else settings.HOURLY_RATE

    if hours > 0:
        cost_to_fix = hours * rate
        roi_data = calculate_roi(cost_to_fix, [], rate)

        roi_table = Table(title="ROI Projection", border_style="orange3")
        roi_table.add_column("Metric", style="bold cyan")
        roi_table.add_column("Value", style="bold white")
        roi_table.add_row("Cost to Fix", f"[red]${roi_data['cost_to_fix']:,.2f}[/]")
        roi_table.add_row("Monthly Savings", f"[green]${roi_data['monthly_savings']:,.2f}[/]")
        roi_table.add_row("Break-even", f"[yellow]{roi_data['break_even_months']} months[/]")
        roi_table.add_row("1-Year Savings", f"[green]${roi_data['one_year_savings']:,.2f}[/]")
        roi_table.add_row("5-Year Savings", f"[bold green]${roi_data['five_year_savings']:,.2f}[/]")
        console.print(roi_table)

        if roi_data["break_even_months"] < 6:
            console.print("\n[bold green]✓ This is an excellent investment — pays back quickly![/]")
        else:
            console.print("\n[yellow]Consider prioritizing higher-urgency items first.[/]")
    else:
        console.print("[yellow]Use --hours to specify estimated fix time. Or use the web dashboard.[/]")
        console.print(
            "[cyan]Example:[/] debtflow roi --hours 40 --rate 150"
        )


@app.command()
def dashboard():
    """Open the DebtFlow web dashboard."""
    console.print(HEADER_PANEL)
    console.print("[cyan]Opening DebtFlow Dashboard...[/]")
    url = settings.FRONTEND_URL
    console.print(f"Dashboard URL: [bold underline]{url}[/]")
    webbrowser.open(url)


@app.command()
def serve(
    port: int = typer.Option(8000, "--port", "-p", help="Port to run on"),
    reload: bool = typer.Option(True, "--reload/--no-reload", help="Enable auto-reload"),
):
    """Start the DebtFlow API server."""
    import uvicorn

    console.print(HEADER_PANEL)
    console.print(f"[cyan]Starting DebtFlow API on [bold]http://localhost:{port}[/][/]")
    console.print(f"[dim]Swagger UI: http://localhost:{port}/docs[/]")
    uvicorn.run("debtflow.api.main:app", host="0.0.0.0", port=port, reload=reload)


if __name__ == "__main__":
    app()
