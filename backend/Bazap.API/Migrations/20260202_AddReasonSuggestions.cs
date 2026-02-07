using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Bazap.API.Migrations
{
    public partial class AddReasonSuggestions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReasonSuggestions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ItemMakat = table.Column<string>(type: "TEXT", nullable: false),
                    Reason = table.Column<string>(type: "TEXT", nullable: false),
                    UsageCount = table.Column<int>(type: "INTEGER", nullable: false),
                    LastUsed = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReasonSuggestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReasonSuggestions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReasonSuggestions_ItemMakat_UserId",
                table: "ReasonSuggestions",
                columns: new[] { "ItemMakat", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_ReasonSuggestions_UserId",
                table: "ReasonSuggestions",
                column: "UserId");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReasonSuggestions");
        }
    }
}
