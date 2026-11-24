CREATE TYPE "public"."perfil_usuario" AS ENUM('GRADUACAO', 'POS_GRADUACAO', 'PROFESSOR');--> statement-breakpoint
CREATE TABLE "emprestimos" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario_id" integer NOT NULL,
	"livro_id" integer NOT NULL,
	"data_emprestimo" date NOT NULL,
	"data_prevista" date NOT NULL,
	"data_devolucao" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emprestimos_prevista_valida" CHECK ("emprestimos"."data_prevista" >= "emprestimos"."data_emprestimo"),
	CONSTRAINT "emprestimos_devolucao_valida" CHECK ("emprestimos"."data_devolucao" IS NULL OR "emprestimos"."data_devolucao" >= "emprestimos"."data_emprestimo")
);
--> statement-breakpoint
CREATE TABLE "livros" (
	"id" serial PRIMARY KEY NOT NULL,
	"titulo" varchar(200) NOT NULL,
	"autor" varchar(160) NOT NULL,
	"isbn" varchar(17) NOT NULL,
	"ano" integer NOT NULL,
	"exemplares_total" integer NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "livros_isbn_unique" UNIQUE("isbn"),
	CONSTRAINT "livros_exemplares_positivos" CHECK ("livros"."exemplares_total" >= 1)
);
--> statement-breakpoint
CREATE TABLE "multas" (
	"id" serial PRIMARY KEY NOT NULL,
	"emprestimo_id" integer NOT NULL,
	"usuario_id" integer NOT NULL,
	"dias_atraso" integer NOT NULL,
	"valor_centavos" integer NOT NULL,
	"paga_em" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "multas_emprestimo_id_unique" UNIQUE("emprestimo_id"),
	CONSTRAINT "multas_valor_positivo" CHECK ("multas"."valor_centavos" > 0)
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"nome" varchar(120) NOT NULL,
	"matricula" varchar(20) NOT NULL,
	"email" varchar(160) NOT NULL,
	"perfil" "perfil_usuario" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_matricula_unique" UNIQUE("matricula")
);
--> statement-breakpoint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_livro_id_livros_id_fk" FOREIGN KEY ("livro_id") REFERENCES "public"."livros"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multas" ADD CONSTRAINT "multas_emprestimo_id_emprestimos_id_fk" FOREIGN KEY ("emprestimo_id") REFERENCES "public"."emprestimos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "multas" ADD CONSTRAINT "multas_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "emprestimos_usuario_idx" ON "emprestimos" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX "emprestimos_livro_idx" ON "emprestimos" USING btree ("livro_id");--> statement-breakpoint
CREATE INDEX "multas_usuario_idx" ON "multas" USING btree ("usuario_id");