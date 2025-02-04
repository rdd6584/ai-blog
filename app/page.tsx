import TextInputResponse from "app/components/ai-question";

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        rdd6584의 블로그
      </h1>
      <p className="mb-4">
        {`frontend 연습용으로 만든 개인 블로그입니다.`}
      </p>
      <div className="flex">
        <TextInputResponse />
      </div>
    </section>
  )
}
