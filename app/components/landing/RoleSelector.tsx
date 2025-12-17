import Link from 'next/link';

const roles = [
  {
    title: "Для Руководителей",
    desc: "Управляемость, рост выручки (NOI), прозрачные отчеты, контроль денег.",
    link: "/resheniya/dlya-rukovoditeley",
    icon: "👔",
    color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
  },
  {
    title: "Для Инженеров",
    desc: "Надежные протоколы, API, схемы подключения, техподдержка 24/7.",
    link: "/resheniya/dlya-inzhenerov",
    icon: "⚙️",
    color: "bg-slate-50 hover:bg-slate-100 border-slate-200",
  },
  {
    title: "Для Службы Безопасности",
    desc: "Тотальный контроль, черные списки, распознавание номеров, надежность.",
    link: "/resheniya/dlya-sluzhby-bezopasnosti",
    icon: "🛡️",
    color: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
  },
];

export default function RoleSelector() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Мы говорим на вашем языке</h2>
          <p className="text-slate-600">Выберите вашу роль, чтобы увидеть релевантные возможности системы</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <Link key={role.link} href={role.link} className={`p-8 rounded-2xl border transition-all duration-300 transform hover:-translate-y-1 ${role.color}`}>
              <div className="text-4xl mb-4">{role.icon}</div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{role.title}</h3>
              <p className="text-slate-600 mb-4">{role.desc}</p>
              <div className="text-sm font-semibold text-slate-900 flex items-center">
                Подробнее <span className="ml-2">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
