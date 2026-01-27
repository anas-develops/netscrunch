alter table "public"."leads" alter column "status" set default 'Warmed-Up'::text;

alter table "public"."prospects" alter column "status" set default 'Not Contacted'::text;


