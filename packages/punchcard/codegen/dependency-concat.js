
function generate(props) {
  const type = props.type;
  const static = props.static;
  const client = props.client;
  // generates the Dependency overload signatures
  for (let i = 1; i < 21; i++) {
    const indexes = Array.from(Array(i).keys()).map((_, n) => n + 1);
    const tParams = `<${indexes.map(n => `D${n} extends ${type}<any>`).join(', ')}>`;
    const params = `${indexes.map(n => `d${n}: D${n}`).join(', ')}`;
    const dArray = `[${indexes.map(n => client ? `${client}<D${n}>` : `D${n}`).join(', ')}]`;
  
    if (static) {
      console.log(`public static concat${tParams}(${params}): ${type}<${dArray}>;`);
    } else {
      console.log(`export function concat${tParams}(${params}): ${type}<${dArray}>;`);
    }
  }
}

// generate({
//   type: 'Dependency',
//   static: false,
//   client: 'Client'
// });
generate({
  type: 'Build',
  static: true
});

