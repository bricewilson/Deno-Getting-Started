export function compose(middleware) {
    return function composedMiddleware(context, next) {
        let index = -1;
        async function dispatch(i) {
            if (i <= index) {
                throw new Error("next() called multiple times.");
            }
            index = i;
            let fn = middleware[i];
            if (i === middleware.length) {
                fn = next;
            }
            if (!fn) {
                return;
            }
            await fn(context, dispatch.bind(null, i + 1));
        }
        return dispatch(0);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlkZGxld2FyZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1pZGRsZXdhcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JBLE1BQU0sVUFBVSxPQUFPLENBSXJCLFVBQThCO0lBRTlCLE9BQU8sU0FBUyxrQkFBa0IsQ0FDaEMsT0FBVSxFQUNWLElBQTBCO1FBRTFCLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRWYsS0FBSyxVQUFVLFFBQVEsQ0FBQyxDQUFTO1lBQy9CLElBQUksQ0FBQyxJQUFJLEtBQUssRUFBRTtnQkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7YUFDbEQ7WUFDRCxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxFQUFFLEdBQWlDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsS0FBSyxVQUFVLENBQUMsTUFBTSxFQUFFO2dCQUMzQixFQUFFLEdBQUcsSUFBSSxDQUFDO2FBQ1g7WUFDRCxJQUFJLENBQUMsRUFBRSxFQUFFO2dCQUNQLE9BQU87YUFDUjtZQUNELE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBRUQsT0FBTyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDckIsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9